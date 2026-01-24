-- ===================================================
-- 018_pending_blocks_slots.sql
-- Step 4 : PENDING devient bloquant + libération REFUSED/CANCELLED
-- ===================================================

-- ===================================================
-- CONTEXTE STEP 4
-- ===================================================
-- Problème identifié : deux bookings au même créneau peuvent être
-- assignés au même staff si les RDV restent 'pending'.
--
-- Solution : 
-- 1) Statuts bloquants = ('pending', 'accepted')
-- 2) Statuts non bloquants = ('refused', 'cancelled')
-- 3) Ajout d'une fonction de vérification de conflit pour l'acceptation admin
-- ===================================================


-- ===================================================
-- 1. MISE À JOUR : find_available_staff_for_slot
-- ===================================================

CREATE OR REPLACE FUNCTION find_available_staff_for_slot(
  p_salon_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT
) AS $$
DECLARE
  v_end_time TIME;
BEGIN
  -- Calculer l'heure de fin du RDV candidat
  v_end_time := (p_start_time + (p_duration_minutes || ' minutes')::interval)::time;
  
  -- Retourner les staffs actifs qui n'ont PAS de RDV bloquant (overlap)
  -- Un RDV est bloquant si : existing.start_time < candidate.end_time AND existing.end_time > candidate.start_time
  -- ⚠️ STEP 4 : Statuts bloquants = ('pending', 'accepted')
  RETURN QUERY
  SELECT 
    sm.id AS staff_id,
    sm.name AS staff_name
  FROM staff_members sm
  WHERE sm.salon_id = p_salon_id
    AND sm.is_active = true
    AND NOT EXISTS (
      SELECT 1 
      FROM appointments a
      WHERE a.salon_id = p_salon_id
        AND a.staff_member_id = sm.id
        AND a.appointment_date = p_appointment_date
        AND a.status IN ('pending', 'accepted')
        -- Condition d'overlap : les deux intervalles se chevauchent
        AND a.start_time < v_end_time
        AND a.end_time > p_start_time
    )
  ORDER BY sm.position ASC, sm.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_available_staff_for_slot IS 
'Step 4: Returns active staff members free for a slot. Blocking statuses: pending, accepted. Non-blocking: refused, cancelled.';


-- ===================================================
-- 2. NOUVELLE FONCTION : Vérifier conflit staff pour acceptation
-- ===================================================

CREATE OR REPLACE FUNCTION check_staff_conflict_for_appointment(
  p_appointment_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_appointment RECORD;
  v_conflicting_count INTEGER;
  v_conflicting_appointments RECORD;
BEGIN
  -- 1. Récupérer les données du RDV
  SELECT 
    a.id,
    a.salon_id,
    a.staff_member_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    sm.name AS staff_name
  INTO v_appointment
  FROM appointments a
  LEFT JOIN staff_members sm ON a.staff_member_id = sm.id
  WHERE a.id = p_appointment_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'appointment_not_found',
      'message', 'Rendez-vous introuvable'
    );
  END IF;
  
  -- 2. Si pas de staff assigné, aucun conflit possible
  IF v_appointment.staff_member_id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'has_conflict', false,
      'message', 'Aucun staff assigné'
    );
  END IF;
  
  -- 3. Chercher des RDV en conflit (même staff, même date, overlap, statut bloquant)
  SELECT COUNT(*) INTO v_conflicting_count
  FROM appointments a
  WHERE a.salon_id = v_appointment.salon_id
    AND a.staff_member_id = v_appointment.staff_member_id
    AND a.appointment_date = v_appointment.appointment_date
    AND a.id != p_appointment_id
    AND a.status IN ('pending', 'accepted')
    -- Overlap
    AND a.start_time < v_appointment.end_time
    AND a.end_time > v_appointment.start_time;
  
  IF v_conflicting_count > 0 THEN
    -- Récupérer les détails du premier conflit pour le message
    SELECT 
      a.id,
      a.customer_name,
      a.start_time,
      a.status
    INTO v_conflicting_appointments
    FROM appointments a
    WHERE a.salon_id = v_appointment.salon_id
      AND a.staff_member_id = v_appointment.staff_member_id
      AND a.appointment_date = v_appointment.appointment_date
      AND a.id != p_appointment_id
      AND a.status IN ('pending', 'accepted')
      AND a.start_time < v_appointment.end_time
      AND a.end_time > v_appointment.start_time
    LIMIT 1;
    
    RETURN json_build_object(
      'success', true,
      'has_conflict', true,
      'conflict_count', v_conflicting_count,
      'staff_name', v_appointment.staff_name,
      'conflicting_appointment', json_build_object(
        'id', v_conflicting_appointments.id,
        'customer_name', v_conflicting_appointments.customer_name,
        'start_time', v_conflicting_appointments.start_time::text,
        'status', v_conflicting_appointments.status
      ),
      'message', format(
        '%s a déjà un rendez-vous à %s (statut: %s)',
        v_appointment.staff_name,
        v_conflicting_appointments.start_time::text,
        v_conflicting_appointments.status
      )
    );
  END IF;
  
  -- 4. Aucun conflit
  RETURN json_build_object(
    'success', true,
    'has_conflict', false,
    'message', 'Aucun conflit détecté'
  );
  
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_staff_conflict_for_appointment IS 
'Step 4: Checks if accepting a pending appointment would create a conflict with other pending/accepted appointments for the same staff';


-- ===================================================
-- 3. NOUVELLE FONCTION : Réassigner automatiquement si conflit
-- ===================================================

CREATE OR REPLACE FUNCTION reassign_staff_if_available(
  p_appointment_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_appointment RECORD;
  v_new_staff_id UUID;
  v_new_staff_name TEXT;
  v_service_duration INTEGER;
BEGIN
  -- 1. Récupérer les données du RDV + durée service
  SELECT 
    a.id,
    a.salon_id,
    a.staff_member_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    s.duration_minutes
  INTO v_appointment
  FROM appointments a
  JOIN services s ON a.service_id = s.id
  WHERE a.id = p_appointment_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'appointment_not_found',
      'message', 'Rendez-vous introuvable'
    );
  END IF;
  
  -- 2. Chercher un staff libre
  SELECT staff_id, staff_name 
  INTO v_new_staff_id, v_new_staff_name
  FROM find_available_staff_for_slot(
    v_appointment.salon_id, 
    v_appointment.appointment_date, 
    v_appointment.start_time, 
    v_appointment.duration_minutes
  )
  LIMIT 1;
  
  IF v_new_staff_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_staff_available',
      'message', 'Aucun membre de l''équipe n''est disponible pour ce créneau'
    );
  END IF;
  
  -- 3. Mettre à jour le staff du RDV
  UPDATE appointments
  SET staff_member_id = v_new_staff_id
  WHERE id = p_appointment_id;
  
  RETURN json_build_object(
    'success', true,
    'reassigned', true,
    'new_staff_id', v_new_staff_id,
    'new_staff_name', v_new_staff_name,
    'message', format('Rendez-vous réassigné à %s', v_new_staff_name)
  );
  
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reassign_staff_if_available IS 
'Step 4: Attempts to reassign an appointment to another available staff member. Returns error if no staff available.';


-- ===================================================
-- 4. ACCÈS AUX NOUVELLES FONCTIONS
-- ===================================================

-- Fonction de vérification accessible aux admins (via service_role)
GRANT EXECUTE ON FUNCTION check_staff_conflict_for_appointment TO service_role;

-- Fonction de réassignation accessible aux admins (via service_role)
GRANT EXECUTE ON FUNCTION reassign_staff_if_available TO service_role;


-- ===================================================
-- 5. STATISTIQUES POST-MIGRATION
-- ===================================================

DO $$
DECLARE
  total_pending INTEGER;
  total_accepted INTEGER;
  total_refused INTEGER;
  total_cancelled INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_pending FROM appointments WHERE status = 'pending';
  SELECT COUNT(*) INTO total_accepted FROM appointments WHERE status = 'accepted';
  SELECT COUNT(*) INTO total_refused FROM appointments WHERE status = 'refused';
  SELECT COUNT(*) INTO total_cancelled FROM appointments WHERE status = 'cancelled';
  
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║  STEP 4 : STATUTS BLOQUANTS                ║';
  RAISE NOTICE '╠════════════════════════════════════════════╣';
  RAISE NOTICE '║  Bloquants   : pending (%), accepted (%)  ║', total_pending, total_accepted;
  RAISE NOTICE '║  Non-bloquants: refused (%), cancelled (%) ║', total_refused, total_cancelled;
  RAISE NOTICE '╚════════════════════════════════════════════╝';
END $$;

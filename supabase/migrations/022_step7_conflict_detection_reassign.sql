-- ===================================================
-- 022_step7_conflict_detection_reassign.sql
-- Step 7.1 & 7.2 : Détection de conflits et réassignation RDV
-- ===================================================

-- ===================================================
-- 1. FONCTION : Détecter les RDV impactés par une absence
-- ===================================================

CREATE OR REPLACE FUNCTION get_appointments_conflicting_with_absence(
  p_staff_member_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ
)
RETURNS TABLE (
  appointment_id UUID,
  customer_name TEXT,
  service_name TEXT,
  appointment_date DATE,
  start_time TIME,
  end_time TIME,
  status TEXT
) AS $$
DECLARE
  v_salon_id UUID;
BEGIN
  -- Récupérer le salon_id du staff
  SELECT salon_id INTO v_salon_id
  FROM staff_members
  WHERE id = p_staff_member_id;

  RETURN QUERY
  SELECT 
    a.id AS appointment_id,
    a.customer_name,
    s.name AS service_name,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status
  FROM appointments a
  JOIN services s ON s.id = a.service_id
  WHERE a.staff_member_id = p_staff_member_id
    AND a.status IN ('pending', 'accepted')  -- Statuts bloquants
    AND (
      -- Le RDV chevauche l'absence
      (a.appointment_date || ' ' || a.start_time)::TIMESTAMPTZ < p_end_datetime
      AND (a.appointment_date || ' ' || a.end_time)::TIMESTAMPTZ > p_start_datetime
    )
  ORDER BY a.appointment_date, a.start_time;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_appointments_conflicting_with_absence IS 
'Returns all appointments (pending/accepted) that conflict with a given absence period.
Used in Step 7.1 to warn admin when creating/editing an absence.';


-- ===================================================
-- 2. FONCTION : Compter les conflits (version légère)
-- ===================================================

CREATE OR REPLACE FUNCTION count_appointments_conflicting_with_absence(
  p_staff_member_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM appointments a
  WHERE a.staff_member_id = p_staff_member_id
    AND a.status IN ('pending', 'accepted')
    AND (
      (a.appointment_date || ' ' || a.start_time)::TIMESTAMPTZ < p_end_datetime
      AND (a.appointment_date || ' ' || a.end_time)::TIMESTAMPTZ > p_start_datetime
    );
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION count_appointments_conflicting_with_absence IS 
'Returns the count of conflicting appointments for quick preview.';


-- ===================================================
-- 3. FONCTION : Trouver les staffs disponibles pour réassigner un RDV
-- ===================================================

CREATE OR REPLACE FUNCTION find_available_staff_for_reassignment(
  p_appointment_id UUID
)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  is_original BOOLEAN
) AS $$
DECLARE
  v_salon_id UUID;
  v_appointment_date DATE;
  v_start_time TIME;
  v_duration_minutes INTEGER;
  v_current_staff_id UUID;
BEGIN
  -- Récupérer les infos du RDV
  SELECT 
    a.salon_id, 
    a.appointment_date, 
    a.start_time, 
    EXTRACT(EPOCH FROM (a.end_time - a.start_time))::INTEGER / 60,
    a.staff_member_id
  INTO v_salon_id, v_appointment_date, v_start_time, v_duration_minutes, v_current_staff_id
  FROM appointments a
  WHERE a.id = p_appointment_id;
  
  IF v_salon_id IS NULL THEN
    RETURN; -- RDV non trouvé
  END IF;

  -- Retourner tous les staffs disponibles pour ce créneau
  RETURN QUERY
  SELECT 
    sm.id AS staff_id,
    sm.name AS staff_name,
    (sm.id = v_current_staff_id) AS is_original
  FROM staff_members sm
  WHERE sm.salon_id = v_salon_id
    AND sm.is_active = true
    AND sm.id != v_current_staff_id  -- Exclure le staff actuel
    AND is_staff_available_for_slot(
      sm.id,
      v_salon_id,
      v_appointment_date,
      v_start_time,
      v_duration_minutes
    ) = true
  ORDER BY sm.position, sm.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_available_staff_for_reassignment IS 
'Returns available staff members who can take over an appointment.
Step 7.2: Used for manual or automatic reassignment.
Excludes the current staff and only returns truly available staff.';


-- ===================================================
-- 4. FONCTION : Réassigner un RDV à un autre staff
-- ===================================================

CREATE OR REPLACE FUNCTION reassign_appointment_to_staff(
  p_appointment_id UUID,
  p_new_staff_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_salon_id UUID;
  v_appointment_date DATE;
  v_start_time TIME;
  v_end_time TIME;
  v_duration_minutes INTEGER;
  v_old_staff_id UUID;
  v_old_staff_name TEXT;
  v_new_staff_name TEXT;
  v_appointment_status TEXT;
BEGIN
  -- Récupérer les infos du RDV
  SELECT 
    a.salon_id, 
    a.appointment_date, 
    a.start_time,
    a.end_time,
    EXTRACT(EPOCH FROM (a.end_time - a.start_time))::INTEGER / 60,
    a.staff_member_id,
    a.status
  INTO v_salon_id, v_appointment_date, v_start_time, v_end_time, v_duration_minutes, v_old_staff_id, v_appointment_status
  FROM appointments a
  WHERE a.id = p_appointment_id;
  
  IF v_salon_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'appointment_not_found',
      'message', 'Rendez-vous introuvable.'
    );
  END IF;
  
  -- Vérifier que le RDV est dans un statut réassignable
  IF v_appointment_status NOT IN ('pending', 'accepted') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_status',
      'message', 'Ce rendez-vous ne peut pas être réassigné (statut: ' || v_appointment_status || ').'
    );
  END IF;
  
  -- Vérifier que le nouveau staff est disponible
  IF NOT is_staff_available_for_slot(
    p_new_staff_id,
    v_salon_id,
    v_appointment_date,
    v_start_time,
    v_duration_minutes
  ) THEN
    SELECT name INTO v_new_staff_name FROM staff_members WHERE id = p_new_staff_id;
    RETURN json_build_object(
      'success', false,
      'error', 'staff_not_available',
      'message', v_new_staff_name || ' n''est pas disponible pour ce créneau.'
    );
  END IF;
  
  -- Récupérer les noms pour le message
  SELECT name INTO v_old_staff_name FROM staff_members WHERE id = v_old_staff_id;
  SELECT name INTO v_new_staff_name FROM staff_members WHERE id = p_new_staff_id;
  
  -- Effectuer la réassignation
  UPDATE appointments
  SET 
    staff_member_id = p_new_staff_id,
    updated_at = NOW()
  WHERE id = p_appointment_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Rendez-vous réassigné de ' || v_old_staff_name || ' à ' || v_new_staff_name,
    'old_staff_id', v_old_staff_id,
    'old_staff_name', v_old_staff_name,
    'new_staff_id', p_new_staff_id,
    'new_staff_name', v_new_staff_name
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'database_error',
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reassign_appointment_to_staff IS 
'Reassigns an appointment to a different staff member.
Step 7.2: Validates availability before reassignment.
Returns error if staff is not available or appointment status is invalid.';


-- ===================================================
-- 5. FONCTION : Réassignation automatique (premier dispo)
-- ===================================================

CREATE OR REPLACE FUNCTION auto_reassign_appointment(
  p_appointment_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_new_staff RECORD;
BEGIN
  -- Trouver le premier staff disponible
  SELECT staff_id, staff_name INTO v_new_staff
  FROM find_available_staff_for_reassignment(p_appointment_id)
  LIMIT 1;
  
  IF v_new_staff.staff_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_staff_available',
      'message', 'Aucun membre de l''équipe n''est disponible pour ce créneau.'
    );
  END IF;
  
  -- Effectuer la réassignation
  RETURN reassign_appointment_to_staff(p_appointment_id, v_new_staff.staff_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_reassign_appointment IS 
'Automatically reassigns an appointment to the first available staff member.
Step 7.2: Convenience function for one-click reassignment.';


-- ===================================================
-- 6. GRANTS
-- ===================================================

-- Ces fonctions ne doivent être appelées que par le service role (admin)
GRANT EXECUTE ON FUNCTION get_appointments_conflicting_with_absence TO service_role;
GRANT EXECUTE ON FUNCTION count_appointments_conflicting_with_absence TO service_role;
GRANT EXECUTE ON FUNCTION find_available_staff_for_reassignment TO service_role;
GRANT EXECUTE ON FUNCTION reassign_appointment_to_staff TO service_role;
GRANT EXECUTE ON FUNCTION auto_reassign_appointment TO service_role;


-- ===================================================
-- 7. Vérification
-- ===================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_appointments_conflicting_with_absence') THEN
    RAISE EXCEPTION 'Function get_appointments_conflicting_with_absence not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_available_staff_for_reassignment') THEN
    RAISE EXCEPTION 'Function find_available_staff_for_reassignment not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reassign_appointment_to_staff') THEN
    RAISE EXCEPTION 'Function reassign_appointment_to_staff not created';
  END IF;
  
  RAISE NOTICE '✅ Migration 022_step7_conflict_detection_reassign completed successfully';
  RAISE NOTICE '   - Function get_appointments_conflicting_with_absence created';
  RAISE NOTICE '   - Function count_appointments_conflicting_with_absence created';
  RAISE NOTICE '   - Function find_available_staff_for_reassignment created';
  RAISE NOTICE '   - Function reassign_appointment_to_staff created';
  RAISE NOTICE '   - Function auto_reassign_appointment created';
END;
$$;

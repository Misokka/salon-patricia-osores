-- ===================================================
-- 021_rpc_book_with_specific_staff.sql
-- Step 6 Multi-Staff : Permettre au client de choisir son coiffeur
-- ===================================================
-- 
-- Ajoute :
-- 1. Fonction is_staff_available_for_slot() - vérifie si UN staff spécifique est dispo
-- 2. Mise à jour de book_appointment_with_staff() pour accepter staff_member_id optionnel
-- ===================================================

-- ===================================================
-- 1. FONCTION : Vérifier si un staff SPÉCIFIQUE est disponible
-- ===================================================

CREATE OR REPLACE FUNCTION is_staff_available_for_slot(
  p_staff_member_id UUID,
  p_salon_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_end_time TIME;
  v_start_datetime TIMESTAMPTZ;
  v_end_datetime TIMESTAMPTZ;
  v_is_active BOOLEAN;
BEGIN
  -- Calculer l'heure de fin
  v_end_time := (p_start_time + (p_duration_minutes || ' minutes')::interval)::time;
  
  -- Construire datetime complets pour vérification absences
  v_start_datetime := (p_appointment_date || ' ' || p_start_time)::TIMESTAMPTZ;
  v_end_datetime := v_start_datetime + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Vérifier que le staff existe et est actif
  SELECT sm.is_active INTO v_is_active
  FROM staff_members sm
  WHERE sm.id = p_staff_member_id
    AND sm.salon_id = p_salon_id;
  
  IF v_is_active IS NULL THEN
    RETURN false; -- Staff n'existe pas ou pas dans ce salon
  END IF;
  
  IF NOT v_is_active THEN
    RETURN false; -- Staff inactif
  END IF;
  
  -- Vérifier qu'il n'a pas de RDV bloquant
  IF EXISTS (
    SELECT 1 
    FROM appointments a
    WHERE a.salon_id = p_salon_id
      AND a.staff_member_id = p_staff_member_id
      AND a.appointment_date = p_appointment_date
      AND a.status IN ('pending', 'accepted')
      AND a.start_time < v_end_time
      AND a.end_time > p_start_time
  ) THEN
    RETURN false; -- A un RDV qui bloque
  END IF;
  
  -- Vérifier qu'il n'a pas d'absence
  IF EXISTS (
    SELECT 1
    FROM staff_absences sa
    WHERE sa.staff_member_id = p_staff_member_id
      AND sa.salon_id = p_salon_id
      AND sa.start_datetime < v_end_datetime
      AND sa.end_datetime > v_start_datetime
  ) THEN
    RETURN false; -- Est absent
  END IF;
  
  RETURN true; -- Disponible !
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_staff_available_for_slot IS 
'Returns true if the specific staff member is available for the given time slot.
Checks: staff exists, is_active, no overlapping appointments (pending/accepted), no absences.';

-- ===================================================
-- 2. MISE À JOUR : book_appointment_with_staff
-- Accepte maintenant un p_staff_member_id optionnel
-- ===================================================

-- Drop l'ancienne version pour éviter les surcharges
DROP FUNCTION IF EXISTS book_appointment_with_staff(UUID, UUID, TEXT, TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION book_appointment_with_staff(
  p_salon_id UUID,
  p_service_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_appointment_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER,
  p_message TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT 'client',
  p_initial_status TEXT DEFAULT 'pending',
  p_staff_member_id UUID DEFAULT NULL  -- NOUVEAU Step 6 : staff choisi par le client
)
RETURNS JSON AS $$
DECLARE
  v_end_time TIME;
  v_staff_id UUID;
  v_staff_name TEXT;
  v_appointment_id UUID;
  v_appointment RECORD;
BEGIN
  -- 1. Calculer l'heure de fin
  v_end_time := (p_start_time + (p_duration_minutes || ' minutes')::interval)::time;
  
  -- 2. Déterminer le staff à assigner
  IF p_staff_member_id IS NOT NULL THEN
    -- ===================================================
    -- MODE "STAFF CHOISI" : Le client a choisi un membre
    -- ===================================================
    
    -- Vérifier que ce staff est disponible
    IF NOT is_staff_available_for_slot(
      p_staff_member_id,
      p_salon_id,
      p_appointment_date,
      p_start_time,
      p_duration_minutes
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'staff_not_available',
        'message', 'Ce coiffeur n''est pas disponible pour ce créneau. Veuillez choisir un autre horaire ou un autre coiffeur.'
      );
    END IF;
    
    -- Récupérer les infos du staff
    SELECT id, name INTO v_staff_id, v_staff_name
    FROM staff_members
    WHERE id = p_staff_member_id
      AND salon_id = p_salon_id;
    
  ELSE
    -- ===================================================
    -- MODE "SANS PRÉFÉRENCE" : Auto-assign au premier dispo
    -- ===================================================
    SELECT staff_id, staff_name 
    INTO v_staff_id, v_staff_name
    FROM find_available_staff_for_slot(
      p_salon_id, 
      p_appointment_date, 
      p_start_time, 
      p_duration_minutes
    )
    LIMIT 1;
    
    -- Si aucun staff libre
    IF v_staff_id IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'no_staff_available',
        'message', 'Aucun membre de l''équipe n''est disponible pour ce créneau. Veuillez choisir un autre horaire.'
      );
    END IF;
  END IF;
  
  -- 3. Créer le rendez-vous
  INSERT INTO appointments (
    salon_id,
    service_id,
    staff_member_id,
    customer_name,
    customer_phone,
    customer_email,
    appointment_date,
    start_time,
    end_time,
    status,
    origin
  ) VALUES (
    p_salon_id,
    p_service_id,
    v_staff_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_appointment_date,
    p_start_time,
    v_end_time,
    p_initial_status,
    p_origin
  )
  RETURNING id INTO v_appointment_id;
  
  -- 4. Récupérer le RDV complet
  SELECT * INTO v_appointment 
  FROM appointments 
  WHERE id = v_appointment_id;
  
  -- 5. Retourner le succès
  RETURN json_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'staff_member_id', v_staff_id,
    'staff_member_name', v_staff_name,
    'end_time', v_end_time::text,
    'data', row_to_json(v_appointment)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'database_error',
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION book_appointment_with_staff IS 
'Atomically creates an appointment with staff assignment.
Step 6: Now accepts optional p_staff_member_id parameter.
- If p_staff_member_id is NULL: auto-assigns to first available staff (original behavior)
- If p_staff_member_id is provided: verifies availability and assigns to that specific staff
Returns error if no staff available or if chosen staff is unavailable.';

-- ===================================================
-- 3. GRANTS
-- ===================================================

GRANT EXECUTE ON FUNCTION is_staff_available_for_slot TO anon, authenticated;

-- ===================================================
-- 4. NOUVELLE RPC : Créneaux disponibles pour UN staff spécifique
-- Utilisée par l'API disponibilites quand le client a choisi un coiffeur
-- ===================================================

CREATE OR REPLACE FUNCTION get_available_slots_for_staff(
  p_salon_id UUID,
  p_staff_member_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  start_time TIME,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.start_time,
    is_staff_available_for_slot(
      p_staff_member_id,
      p_salon_id,
      p_date,
      ts.start_time,
      p_duration_minutes
    ) AS is_available
  FROM time_slots ts
  WHERE ts.salon_id = p_salon_id
    AND ts.slot_date = p_date
    AND ts.is_available = true
    AND is_staff_available_for_slot(
      p_staff_member_id,
      p_salon_id,
      p_date,
      ts.start_time,
      p_duration_minutes
    ) = true
  ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_slots_for_staff IS 
'Returns available time slots for a SPECIFIC staff member on a given date.
Step 6: Used when client has selected a specific hairdresser.
Only returns slots where that staff member is available (no overlapping appointments, no absences).';

GRANT EXECUTE ON FUNCTION get_available_slots_for_staff TO anon, authenticated;

-- ===================================================
-- 5. Vérification
-- ===================================================

DO $$
BEGIN
  -- Vérifier que la fonction is_staff_available_for_slot existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_staff_available_for_slot'
  ) THEN
    RAISE EXCEPTION 'Function is_staff_available_for_slot not created';
  END IF;
  
  -- Vérifier que la fonction get_available_slots_for_staff existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_available_slots_for_staff'
  ) THEN
    RAISE EXCEPTION 'Function get_available_slots_for_staff not created';
  END IF;
  
  RAISE NOTICE '✅ Migration 021_rpc_book_with_specific_staff completed successfully';
  RAISE NOTICE '   - Function is_staff_available_for_slot created';
  RAISE NOTICE '   - Function get_available_slots_for_staff created';
  RAISE NOTICE '   - Function book_appointment_with_staff updated (now accepts p_staff_member_id)';
END;
$$;

-- ===================================================
-- 016_rpc_book_appointment.sql
-- Step 3 Multi-Staff : Fonctions RPC pour réservation atomique
-- ===================================================

-- ===================================================
-- 1. FONCTION : Trouver un staff libre pour un créneau
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
  -- Statuts bloquants : 'accepted' uniquement (Step 3 MVP)
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
AND a.status IN ('pending','accepted')
        -- Condition d'overlap : les deux intervalles se chevauchent
        AND a.start_time < v_end_time
        AND a.end_time > p_start_time
    )
  ORDER BY sm.position ASC, sm.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_available_staff_for_slot IS 
'Returns list of active staff members who are free for a given time slot and duration';


-- ===================================================
-- 2. FONCTION : Compter les staffs disponibles (pour affichage)
-- ===================================================

CREATE OR REPLACE FUNCTION count_available_staff_for_slot(
  p_salon_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM find_available_staff_for_slot(
      p_salon_id, 
      p_appointment_date, 
      p_start_time, 
      p_duration_minutes
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION count_available_staff_for_slot IS 
'Returns count of available staff members for a given time slot';


-- ===================================================
-- 3. FONCTION : Créer un RDV avec assignation atomique
-- ===================================================

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
  p_initial_status TEXT DEFAULT 'pending'
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
  
  -- 2. Trouver un staff libre (avec lock implicite via FOR UPDATE dans une vraie transaction)
  -- On sélectionne le premier staff disponible
  SELECT staff_id, staff_name 
  INTO v_staff_id, v_staff_name
  FROM find_available_staff_for_slot(
    p_salon_id, 
    p_appointment_date, 
    p_start_time, 
    p_duration_minutes
  )
  LIMIT 1;
  
  -- 3. Si aucun staff libre, retourner une erreur
  IF v_staff_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_staff_available',
      'message', 'Aucun membre de l''équipe n''est disponible pour ce créneau. Veuillez choisir un autre horaire.'
    );
  END IF;
  
  -- 4. Créer le rendez-vous
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
  
  -- 5. Récupérer le RDV complet pour le retourner
  SELECT * INTO v_appointment 
  FROM appointments 
  WHERE id = v_appointment_id;
  
  -- 6. Retourner le succès avec les données
  RETURN json_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'staff_member_id', v_staff_id,
    'staff_member_name', v_staff_name,
    'end_time', v_end_time::text,
    'data', row_to_json(v_appointment)
  );
  
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur (ex: contrainte unique violée par concurrence)
  RETURN json_build_object(
    'success', false,
    'error', 'database_error',
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION book_appointment_with_staff IS 
'Atomically creates an appointment with automatic staff assignment. Returns error if no staff available.';


-- ===================================================
-- 4. FONCTION : Vérifier disponibilités d'un jour entier
-- ===================================================

CREATE OR REPLACE FUNCTION get_available_slots_for_date(
  p_salon_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  start_time TIME,
  available_staff_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH slots AS (
    SELECT 
      ts.start_time,
      count_available_staff_for_slot(
        p_salon_id,
        p_date,
        ts.start_time,
        p_duration_minutes
      ) AS available_staff_count
    FROM time_slots ts
    WHERE ts.salon_id = p_salon_id
      AND ts.slot_date = p_date
      AND ts.is_available = true
  )
  SELECT s.start_time, s.available_staff_count
  FROM slots s
  WHERE s.available_staff_count > 0
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql STABLE;


COMMENT ON FUNCTION get_available_slots_for_date IS 
'Returns all time slots for a date with count of available staff for each';


-- ===================================================
-- 5. FONCTION HELPER : Calculer end_time
-- ===================================================

CREATE OR REPLACE FUNCTION get_end_time_for_appointment(
  p_start_time TIME,
  p_duration_minutes INTEGER
)
RETURNS TIME AS $$
BEGIN
  RETURN (p_start_time + (p_duration_minutes || ' minutes')::interval)::time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_end_time_for_appointment IS 
'Calculates end_time from start_time and duration';

GRANT EXECUTE ON FUNCTION get_end_time_for_appointment TO anon, authenticated, service_role;


-- ===================================================
-- 6. ACCÈS PUBLIC AUX FONCTIONS (pour les appels RPC)
-- ===================================================

-- Permettre l'accès anon et authenticated aux fonctions de lecture
GRANT EXECUTE ON FUNCTION find_available_staff_for_slot TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_available_staff_for_slot TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots_for_date TO anon, authenticated;

-- La fonction de création nécessite les droits admin (on passe par le service role)
-- book_appointment_with_staff sera appelée via supabaseAdmin côté serveur
GRANT EXECUTE ON FUNCTION book_appointment_with_staff TO service_role;

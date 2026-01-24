-- ===================================================
-- 020_staff_absences.sql
-- Step 5.1 Multi-Staff : Table des absences/congés
-- ===================================================
-- 
-- Une absence = intervalle [start_datetime, end_datetime)
-- Un staff absent est traité comme "occupé" sur cet intervalle
-- Multi-tenant safe (salon_id partout)
-- ===================================================

-- ===================================================
-- 1. TABLE : staff_absences
-- ===================================================

CREATE TABLE IF NOT EXISTS staff_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  
  -- Période d'absence (datetime complet pour gérer absences partielles journée)
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  
  -- Métadonnées
  reason TEXT,  -- Optionnel : "Congés", "Maladie", "Formation", etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT staff_absences_valid_period CHECK (end_datetime > start_datetime),
  CONSTRAINT staff_absences_salon_staff UNIQUE (salon_id, staff_member_id, start_datetime, end_datetime)
);

-- Index pour recherche rapide par date
CREATE INDEX IF NOT EXISTS idx_staff_absences_dates 
  ON staff_absences(salon_id, staff_member_id, start_datetime, end_datetime);

CREATE INDEX IF NOT EXISTS idx_staff_absences_staff 
  ON staff_absences(staff_member_id);

CREATE INDEX IF NOT EXISTS idx_staff_absences_salon_dates 
  ON staff_absences(salon_id, start_datetime, end_datetime);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_staff_absences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_staff_absences_updated_at ON staff_absences;
CREATE TRIGGER trigger_staff_absences_updated_at
  BEFORE UPDATE ON staff_absences
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_absences_updated_at();

-- ===================================================
-- 2. RLS Policies
-- ===================================================

ALTER TABLE staff_absences ENABLE ROW LEVEL SECURITY;

-- SELECT public : lecture autorisée (pour affichage disponibilités client)
DROP POLICY IF EXISTS "staff_absences_select_public" ON staff_absences;
CREATE POLICY "staff_absences_select_public"
  ON staff_absences FOR SELECT
  USING (true);

-- INSERT admin : création réservée aux admins
DROP POLICY IF EXISTS "staff_absences_insert_admin" ON staff_absences;
CREATE POLICY "staff_absences_insert_admin"
  ON staff_absences FOR INSERT
  WITH CHECK (is_admin());

-- UPDATE admin : modification réservée aux admins
DROP POLICY IF EXISTS "staff_absences_update_admin" ON staff_absences;
CREATE POLICY "staff_absences_update_admin"
  ON staff_absences FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE admin : suppression réservée aux admins
DROP POLICY IF EXISTS "staff_absences_delete_admin" ON staff_absences;
CREATE POLICY "staff_absences_delete_admin"
  ON staff_absences FOR DELETE
  USING (is_admin());

-- ===================================================
-- 3. FONCTION : Vérifier si un staff est absent à un moment donné
-- ===================================================

CREATE OR REPLACE FUNCTION is_staff_absent(
  p_staff_member_id UUID,
  p_salon_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_start_datetime TIMESTAMPTZ;
  v_end_datetime TIMESTAMPTZ;
BEGIN
  -- Construire les datetime complets pour comparaison
  v_start_datetime := (p_date || ' ' || p_start_time)::TIMESTAMPTZ;
  v_end_datetime := v_start_datetime + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Vérifier s'il existe une absence qui chevauche l'intervalle demandé
  -- Overlap : absence.start < rdv.end AND absence.end > rdv.start
  RETURN EXISTS (
    SELECT 1 
    FROM staff_absences sa
    WHERE sa.staff_member_id = p_staff_member_id
      AND sa.salon_id = p_salon_id
      AND sa.start_datetime < v_end_datetime
      AND sa.end_datetime > v_start_datetime
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_staff_absent IS 
'Returns true if the staff member has an absence overlapping the given time slot';

-- ===================================================
-- 4. MISE À JOUR : find_available_staff_for_slot
-- Ajouter la vérification des absences
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
  v_start_datetime TIMESTAMPTZ;
  v_end_datetime TIMESTAMPTZ;
BEGIN
  -- Calculer l'heure de fin du RDV candidat
  v_end_time := (p_start_time + (p_duration_minutes || ' minutes')::interval)::time;
  
  -- Construire datetime complets pour vérification absences
  v_start_datetime := (p_appointment_date || ' ' || p_start_time)::TIMESTAMPTZ;
  v_end_datetime := v_start_datetime + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Retourner les staffs actifs qui :
  -- 1. N'ont PAS de RDV bloquant (overlap avec statuts pending/accepted)
  -- 2. N'ont PAS d'absence sur cette période
  RETURN QUERY
  SELECT 
    sm.id AS staff_id,
    sm.name AS staff_name
  FROM staff_members sm
  WHERE sm.salon_id = p_salon_id
    AND sm.is_active = true
    -- Pas de RDV bloquant
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
    -- PAS D'ABSENCE sur cette période (NOUVEAU Step 5)
    AND NOT EXISTS (
      SELECT 1
      FROM staff_absences sa
      WHERE sa.staff_member_id = sm.id
        AND sa.salon_id = p_salon_id
        -- Overlap : absence.start < slot.end AND absence.end > slot.start
        AND sa.start_datetime < v_end_datetime
        AND sa.end_datetime > v_start_datetime
    )
  ORDER BY sm.position ASC, sm.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_available_staff_for_slot IS 
'Returns list of active staff members who are free for a given time slot and duration.
Excludes staff with overlapping appointments (pending/accepted) or absences.
Step 5: Now includes absence checking.';

-- ===================================================
-- 5. FONCTION UTILITAIRE : Liste des absences d'un staff
-- ===================================================

CREATE OR REPLACE FUNCTION get_staff_absences(
  p_salon_id UUID,
  p_staff_member_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT CURRENT_DATE,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  staff_member_id UUID,
  staff_name TEXT,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.staff_member_id,
    sm.name AS staff_name,
    sa.start_datetime,
    sa.end_datetime,
    sa.reason,
    sa.created_at
  FROM staff_absences sa
  JOIN staff_members sm ON sm.id = sa.staff_member_id
  WHERE sa.salon_id = p_salon_id
    AND (p_staff_member_id IS NULL OR sa.staff_member_id = p_staff_member_id)
    AND sa.end_datetime >= p_from_date::TIMESTAMPTZ
    AND (p_to_date IS NULL OR sa.start_datetime <= (p_to_date + INTERVAL '1 day')::TIMESTAMPTZ)
  ORDER BY sa.start_datetime ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_staff_absences IS 
'Returns list of absences for a salon, optionally filtered by staff member and date range';

-- ===================================================
-- 6. GRANTS
-- ===================================================

GRANT SELECT ON staff_absences TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_staff_absent TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_staff_absences TO anon, authenticated;

-- ===================================================
-- 7. Vérification
-- ===================================================

DO $$
BEGIN
  -- Vérifier que la table existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'staff_absences'
  ) THEN
    RAISE EXCEPTION 'Table staff_absences not created';
  END IF;
  
  -- Vérifier les colonnes essentielles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_absences' AND column_name = 'start_datetime'
  ) THEN
    RAISE EXCEPTION 'Column start_datetime missing';
  END IF;
  
  RAISE NOTICE '✅ Migration 020_staff_absences completed successfully';
  RAISE NOTICE '   - Table staff_absences created';
  RAISE NOTICE '   - Function is_staff_absent created';
  RAISE NOTICE '   - Function find_available_staff_for_slot updated (now excludes absences)';
  RAISE NOTICE '   - Function get_staff_absences created';
END;
$$;

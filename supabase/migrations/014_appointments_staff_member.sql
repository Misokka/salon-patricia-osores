-- ===================================================
-- 014_appointments_staff_member.sql
-- Step 2 Multi-Staff : Assignation staff aux RDV
-- ===================================================

-- ===================================================
-- 1. AJOUTER LA COLONNE staff_member_id
-- ===================================================

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.staff_member_id IS 
'Staff member assigned to this appointment. NULL = unassigned or staff deleted.';

-- ===================================================
-- 2. INDEX POUR REQUÊTES MULTI-STAFF
-- ===================================================

-- Index pour rechercher les RDV d'un staff sur une période
CREATE INDEX IF NOT EXISTS idx_appointments_staff_date
ON appointments (salon_id, staff_member_id, appointment_date, start_time)
WHERE status IN ('pending', 'accepted');

-- Index pour les RDV non assignés
CREATE INDEX IF NOT EXISTS idx_appointments_unassigned
ON appointments (salon_id, appointment_date)
WHERE staff_member_id IS NULL AND status IN ('pending', 'accepted');

-- ===================================================
-- 3. BACKFILL : Assigner le staff par défaut aux RDV existants
-- ===================================================

-- D'abord, s'assurer que chaque salon a au moins un staff member
-- (normalement fait en Step 1, mais on sécurise)
INSERT INTO staff_members (salon_id, name, is_active, position)
SELECT 
  s.id,
  'Équipe ' || s.name,
  true,
  0
FROM salons s
WHERE NOT EXISTS (
  SELECT 1 FROM staff_members sm WHERE sm.salon_id = s.id
);

-- Maintenant, backfill : assigner le premier staff actif à chaque RDV sans staff
UPDATE appointments a
SET staff_member_id = (
  SELECT sm.id 
  FROM staff_members sm 
  WHERE sm.salon_id = a.salon_id 
    AND sm.is_active = true 
  ORDER BY sm.position ASC, sm.created_at ASC 
  LIMIT 1
)
WHERE a.staff_member_id IS NULL;

-- ===================================================
-- 4. VÉRIFICATION POST-BACKFILL
-- ===================================================

DO $$
DECLARE
  total_appointments INTEGER;
  assigned_appointments INTEGER;
  unassigned_appointments INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_appointments FROM appointments;
  SELECT COUNT(*) INTO assigned_appointments FROM appointments WHERE staff_member_id IS NOT NULL;
  SELECT COUNT(*) INTO unassigned_appointments FROM appointments WHERE staff_member_id IS NULL;
  
  RAISE NOTICE 'Backfill terminé : % RDV total, % assignés, % non assignés', 
    total_appointments, assigned_appointments, unassigned_appointments;
END $$;

-- ===================================================
-- 5. FONCTION HELPER : Obtenir le staff par défaut d'un salon
-- ===================================================

CREATE OR REPLACE FUNCTION get_default_staff_member_id(p_salon_id UUID)
RETURNS UUID AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  SELECT id INTO v_staff_id
  FROM staff_members
  WHERE salon_id = p_salon_id
    AND is_active = true
  ORDER BY position ASC, created_at ASC
  LIMIT 1;
  
  RETURN v_staff_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_default_staff_member_id(UUID) IS 
'Returns the default (first active) staff member ID for a salon';

-- ===================================================
-- 6. TRIGGER : Auto-assigner un staff si non fourni (optionnel)
-- ===================================================

-- Note: On préfère gérer ça côté application pour plus de contrôle,
-- mais on garde ce trigger en commentaire comme fallback possible.

/*
CREATE OR REPLACE FUNCTION auto_assign_staff_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.staff_member_id IS NULL THEN
    NEW.staff_member_id := get_default_staff_member_id(NEW.salon_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_assign_staff
BEFORE INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION auto_assign_staff_member();
*/

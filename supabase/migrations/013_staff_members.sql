-- ===================================================
-- 013_staff_members.sql
-- Introduction du concept multi-staff (Step 1 MVP)
-- ===================================================

-- ===================================================
-- 1. TABLE STAFF_MEMBERS
-- ===================================================

CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  
  -- Statut actif/inactif (permet de désactiver sans supprimer)
  is_active BOOLEAN DEFAULT true,
  
  -- Position d'affichage (pour trier dans l'UI)
  position INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE staff_members IS 'Membres de l''équipe d''un salon (coiffeurs, employés)';
COMMENT ON COLUMN staff_members.is_active IS 'False = membre désactivé (congé longue durée, départ)';
COMMENT ON COLUMN staff_members.position IS 'Ordre d''affichage dans les listes';

-- ===================================================
-- 2. INDEX DE PERFORMANCE
-- ===================================================

CREATE INDEX IF NOT EXISTS idx_staff_members_salon_id
ON staff_members (salon_id);

CREATE INDEX IF NOT EXISTS idx_staff_members_salon_active
ON staff_members (salon_id, is_active)
WHERE is_active = true;

-- ===================================================
-- 3. TRIGGER updated_at
-- ===================================================

CREATE TRIGGER trg_staff_members_updated_at
BEFORE UPDATE ON staff_members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ===================================================
-- 4. RLS POLICIES
-- ===================================================

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- SELECT public : les membres actifs sont visibles (pour le booking client à terme)
DROP POLICY IF EXISTS "staff_members_select_public" ON staff_members;
CREATE POLICY "staff_members_select_public"
ON staff_members
FOR SELECT
USING (is_active = true);

-- SELECT admin : tous les membres (actifs et inactifs)
DROP POLICY IF EXISTS "staff_members_select_admin" ON staff_members;
CREATE POLICY "staff_members_select_admin"
ON staff_members
FOR SELECT
USING (is_admin());

-- INSERT admin
DROP POLICY IF EXISTS "staff_members_insert_admin" ON staff_members;
CREATE POLICY "staff_members_insert_admin"
ON staff_members
FOR INSERT
WITH CHECK (is_admin());

-- UPDATE admin
DROP POLICY IF EXISTS "staff_members_update_admin" ON staff_members;
CREATE POLICY "staff_members_update_admin"
ON staff_members
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- DELETE admin
DROP POLICY IF EXISTS "staff_members_delete_admin" ON staff_members;
CREATE POLICY "staff_members_delete_admin"
ON staff_members
FOR DELETE
USING (is_admin());

-- ===================================================
-- 5. SEED : Créer un staff par défaut pour chaque salon existant
-- ===================================================

-- Pour chaque salon qui n'a pas encore de staff_member, en créer un par défaut
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

-- ===================================================
-- 6. CONTRAINTE : Au moins 1 staff actif par salon
-- ===================================================

-- Fonction pour vérifier qu'on ne désactive pas le dernier staff actif
CREATE OR REPLACE FUNCTION check_at_least_one_active_staff()
RETURNS TRIGGER AS $$
BEGIN
  -- Si on désactive un membre ou on le supprime
  IF (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true)
     OR TG_OP = 'DELETE' THEN
    
    DECLARE
      active_count INTEGER;
      salon UUID := COALESCE(OLD.salon_id, NEW.salon_id);
    BEGIN
      SELECT COUNT(*) INTO active_count
      FROM staff_members
      WHERE salon_id = salon
        AND is_active = true
        AND id != OLD.id;
      
      IF active_count = 0 THEN
        RAISE EXCEPTION 'Impossible : il doit rester au moins 1 membre actif dans le salon';
      END IF;
    END;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_at_least_one_active_staff ON staff_members;
CREATE TRIGGER trg_check_at_least_one_active_staff
BEFORE UPDATE OR DELETE ON staff_members
FOR EACH ROW
EXECUTE FUNCTION check_at_least_one_active_staff();

-- ===================================================
-- 7. STATS POST-MIGRATION
-- ===================================================

DO $$
DECLARE
  total_staff INTEGER;
  salons_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_staff FROM staff_members;
  SELECT COUNT(DISTINCT salon_id) INTO salons_count FROM staff_members;
  
  RAISE NOTICE 'Migration staff_members terminée : % membre(s) pour % salon(s)', total_staff, salons_count;
END $$;

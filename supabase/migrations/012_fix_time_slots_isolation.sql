-- ===================================================
-- 012_fix_time_slots_isolation.sql
-- Correction isolation des créneaux par salon
-- ===================================================

-- ===================================================
-- 1. NETTOYAGE DES DOUBLONS EXISTANTS
-- ===================================================

-- Identifier et supprimer les doublons (garder le plus ancien)
-- Un doublon = même salon_id + slot_date + start_time

WITH duplicates AS (
  SELECT 
    id,
    salon_id,
    slot_date,
    start_time,
    ROW_NUMBER() OVER (
      PARTITION BY salon_id, slot_date, start_time 
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM time_slots
)
DELETE FROM time_slots
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ===================================================
-- 2. VÉRIFICATION DE LA CONTRAINTE D'UNICITÉ
-- ===================================================

-- La contrainte time_slots_unique existe déjà dans 004_time_slots.sql
-- mais on vérifie qu'elle est active

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'time_slots_unique'
  ) THEN
    ALTER TABLE time_slots
    ADD CONSTRAINT time_slots_unique
    UNIQUE (salon_id, slot_date, start_time);
  END IF;
END $$;

-- ===================================================
-- 3. AJOUT D'INDEX DE PERFORMANCE
-- ===================================================

-- Index pour les requêtes publiques filtrées par salon + date
CREATE INDEX IF NOT EXISTS idx_time_slots_salon_date_time
ON time_slots (salon_id, slot_date, start_time);

-- Index pour les requêtes de disponibilité
CREATE INDEX IF NOT EXISTS idx_time_slots_salon_available
ON time_slots (salon_id, is_available, slot_date)
WHERE is_available = true;

-- Index pour les requêtes admin
CREATE INDEX IF NOT EXISTS idx_time_slots_salon_created
ON time_slots (salon_id, created_at DESC);

-- ===================================================
-- 4. FONCTION DE VALIDATION (SÉCURITÉ SUPPLÉMENTAIRE)
-- ===================================================

-- Fonction trigger pour empêcher l'insertion sans salon_id
CREATE OR REPLACE FUNCTION validate_time_slot_salon_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.salon_id IS NULL THEN
    RAISE EXCEPTION 'salon_id est obligatoire pour time_slots';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger avant insertion/update
DROP TRIGGER IF EXISTS trg_validate_time_slot_salon_id ON time_slots;
CREATE TRIGGER trg_validate_time_slot_salon_id
BEFORE INSERT OR UPDATE ON time_slots
FOR EACH ROW
EXECUTE FUNCTION validate_time_slot_salon_id();

-- ===================================================
-- 5. STATISTIQUES POST-NETTOYAGE
-- ===================================================

DO $$
DECLARE
  total_slots INTEGER;
  salons_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_slots FROM time_slots;
  SELECT COUNT(DISTINCT salon_id) INTO salons_count FROM time_slots;
  
  RAISE NOTICE 'Nettoyage terminé : % créneaux pour % salon(s)', total_slots, salons_count;
END $$;

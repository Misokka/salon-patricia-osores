-- ===================================================
-- 015_appointments_end_time.sql
-- Step 3 Multi-Staff : Ajouter end_time pour calcul overlap
-- ===================================================

-- ===================================================
-- 1. AJOUTER LA COLONNE end_time
-- ===================================================

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS end_time TIME;

COMMENT ON COLUMN appointments.end_time IS 
'End time of appointment = start_time + service duration. Used for overlap calculations.';

-- ===================================================
-- 2. BACKFILL : Calculer end_time pour les RDV existants
-- ===================================================

-- Mettre à jour les RDV existants avec end_time calculé depuis le service
UPDATE appointments a
SET end_time = (
  a.start_time + (s.duration_minutes || ' minutes')::interval
)::time
FROM services s
WHERE a.service_id = s.id
  AND a.end_time IS NULL;

-- ===================================================
-- 3. INDEX POUR LES REQUÊTES D'OVERLAP
-- ===================================================

-- Index composite pour les requêtes d'overlap (rechercher les RDV qui chevauchent une période)
CREATE INDEX IF NOT EXISTS idx_appointments_overlap
ON appointments (salon_id, staff_member_id, appointment_date, start_time, end_time)
WHERE status = 'accepted';

-- ===================================================
-- 4. VÉRIFICATION POST-BACKFILL
-- ===================================================

DO $$
DECLARE
  total_appointments INTEGER;
  with_end_time INTEGER;
  without_end_time INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_appointments FROM appointments;
  SELECT COUNT(*) INTO with_end_time FROM appointments WHERE end_time IS NOT NULL;
  SELECT COUNT(*) INTO without_end_time FROM appointments WHERE end_time IS NULL;
  
  RAISE NOTICE 'Backfill end_time : % RDV total, % avec end_time, % sans end_time', 
    total_appointments, with_end_time, without_end_time;
END $$;

-- ===================================================
-- 017_fix_time_slots_availability.sql
-- Réparation du bug : time_slots bloqués à tort par les RDV
-- ===================================================

-- ===================================================
-- CONTEXTE DU PROBLÈME
-- ===================================================
-- Avant ce fix, lors de la création d'un RDV, on mettait time_slots.is_available = false
-- Ce qui bloquait le créneau pour TOUT LE SALON (comportement mono-staff).
-- En multi-staff, un créneau doit rester disponible tant qu'il reste des staffs libres.
--
-- SOLUTION :
-- - time_slots.is_available représente "créneau dans les horaires d'ouverture"
-- - L'occupation est gérée par appointments + staff_member_id + overlap
-- - Ne JAMAIS mettre is_available=false à cause d'un RDV
-- ===================================================

-- ===================================================
-- 1. REMETTRE is_available=true POUR LES SLOTS FUTURS
-- ===================================================

-- Stratégie : remettre tous les slots futurs/actuels à is_available=true
-- car ils représentent la grille d'ouverture, pas l'occupation

UPDATE time_slots
SET is_available = true
WHERE slot_date >= CURRENT_DATE
  AND is_available = false;

-- ===================================================
-- 2. VÉRIFICATION POST-RÉPARATION
-- ===================================================

DO $$
DECLARE
  total_future_slots INTEGER;
  available_future_slots INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_future_slots 
  FROM time_slots 
  WHERE slot_date >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO available_future_slots 
  FROM time_slots 
  WHERE slot_date >= CURRENT_DATE 
    AND is_available = true;
  
  RAISE NOTICE 'Réparation time_slots : % slots futurs, % disponibles (devrait être ~100%%)', 
    total_future_slots, available_future_slots;
END $$;

-- ===================================================
-- 3. NETTOYAGE OPTIONNEL : Slots passés
-- ===================================================

-- Pour les slots passés, on peut soit :
-- A) Les garder en l'état (pas d'impact fonctionnel)
-- B) Les supprimer pour alléger la DB

-- Option B (recommandé) : supprimer les slots de plus de 30 jours
-- Décommenter si souhaité :

/*
DELETE FROM time_slots
WHERE slot_date < CURRENT_DATE - INTERVAL '30 days';

RAISE NOTICE 'Nettoyage : slots de plus de 30 jours supprimés';
*/

-- ===================================================
-- 4. COMMENTAIRE DE COLONNE MIS À JOUR
-- ===================================================

COMMENT ON COLUMN time_slots.is_available IS 
'True if the slot is within opening hours (grid availability). 
NOT affected by appointments - use RPC count_available_staff_for_slot() for booking availability.';

-- ===================================================
-- 5. VALIDATION : Tester les fonctions RPC
-- ===================================================

-- Test rapide : vérifier qu'on peut compter les staffs libres
DO $$
DECLARE
  test_salon_id UUID;
  test_date DATE;
  test_time TIME;
  available_count INTEGER;
BEGIN
  -- Prendre le premier salon actif
  SELECT id INTO test_salon_id FROM salons WHERE is_active = true LIMIT 1;
  
  IF test_salon_id IS NOT NULL THEN
    -- Test sur aujourd'hui à 14:00
    test_date := CURRENT_DATE;
    test_time := '14:00:00'::time;
    
    -- Appeler la RPC
    SELECT count_available_staff_for_slot(
      test_salon_id,
      test_date,
      test_time,
      30
    ) INTO available_count;
    
    RAISE NOTICE 'Test RPC : % staff(s) disponible(s) pour % à %', 
      available_count, test_date, test_time;
  END IF;
END $$;

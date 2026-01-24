-- ===================================================
-- 019_fix_appointment_slots_multi_staff.sql
-- Fix contrainte bloquante pour multi-staff
-- ===================================================

-- ===================================================
-- PROBLÈME IDENTIFIÉ
-- ===================================================
-- La contrainte UNIQUE sur `time_slot_id` empêche plusieurs RDV
-- de démarrer au même time_slot, même si staffs différents.
--
-- En multi-staff, 2 RDV peuvent avoir le même start_time (time_slot_id)
-- si 2 staffs libres.
--
-- SOLUTION :
-- - Supprimer UNIQUE(time_slot_id) ← bloque le multi-staff
-- - Ajouter UNIQUE(appointment_id, time_slot_id) ← évite doublons par RDV
-- ===================================================

-- ===================================================
-- 1. SUPPRIMER LA CONTRAINTE BLOQUANTE
-- ===================================================

ALTER TABLE appointment_slots 
DROP CONSTRAINT IF EXISTS unique_time_slot;

-- ===================================================
-- 2. AJOUTER LA BONNE CONTRAINTE
-- ===================================================

-- Un RDV ne doit pas référencer deux fois le même time_slot
-- Mais plusieurs RDV peuvent utiliser le même time_slot (multi-staff)
ALTER TABLE appointment_slots
ADD CONSTRAINT unique_appointment_time_slot
UNIQUE (appointment_id, time_slot_id);

-- ===================================================
-- 3. COMMENTAIRE EXPLICATIF
-- ===================================================

COMMENT ON CONSTRAINT unique_appointment_time_slot ON appointment_slots IS 
'Prevents duplicate time_slot references within one appointment. Multiple appointments can share the same time_slot (multi-staff support).';

-- ===================================================
-- 4. VÉRIFICATION POST-MIGRATION
-- ===================================================

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Vérifier que unique_time_slot n'existe plus
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'appointment_slots'
    AND constraint_name = 'unique_time_slot';
  
  IF constraint_count > 0 THEN
    RAISE WARNING 'ERREUR: La contrainte unique_time_slot existe encore!';
  ELSE
    RAISE NOTICE '✅ Contrainte unique_time_slot supprimée avec succès';
  END IF;
  
  -- Vérifier que unique_appointment_time_slot existe
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'appointment_slots'
    AND constraint_name = 'unique_appointment_time_slot';
  
  IF constraint_count = 0 THEN
    RAISE WARNING 'ERREUR: La contrainte unique_appointment_time_slot n''existe pas!';
  ELSE
    RAISE NOTICE '✅ Contrainte unique_appointment_time_slot créée avec succès';
  END IF;
END $$;

-- ===================================================
-- 5. TEST RAPIDE (COMMENTÉ - À DÉCOMMENTER POUR VALIDER)
-- ===================================================

/*
-- Test 1 : Deux RDV peuvent utiliser le même time_slot (multi-staff OK)
DO $$
DECLARE
  test_salon_id UUID;
  test_service_id UUID;
  test_slot_id UUID;
  test_appt1_id UUID;
  test_appt2_id UUID;
BEGIN
  -- Créer données test
  SELECT id INTO test_salon_id FROM salons WHERE is_active = true LIMIT 1;
  SELECT id INTO test_service_id FROM services WHERE salon_id = test_salon_id LIMIT 1;
  SELECT id INTO test_slot_id FROM time_slots WHERE salon_id = test_salon_id AND is_available = true LIMIT 1;
  
  -- Créer 2 RDV différents
  INSERT INTO appointments (salon_id, service_id, customer_name, customer_email, appointment_date, start_time, end_time, status)
  VALUES (test_salon_id, test_service_id, 'Test 1', 'test1@test.com', CURRENT_DATE + 1, '10:00', '10:30', 'pending')
  RETURNING id INTO test_appt1_id;
  
  INSERT INTO appointments (salon_id, service_id, customer_name, customer_email, appointment_date, start_time, end_time, status)
  VALUES (test_salon_id, test_service_id, 'Test 2', 'test2@test.com', CURRENT_DATE + 1, '10:00', '10:30', 'pending')
  RETURNING id INTO test_appt2_id;
  
  -- Insérer les 2 RDV avec le MÊME time_slot_id (multi-staff)
  INSERT INTO appointment_slots (appointment_id, time_slot_id, slot_order)
  VALUES (test_appt1_id, test_slot_id, 1);
  
  INSERT INTO appointment_slots (appointment_id, time_slot_id, slot_order)
  VALUES (test_appt2_id, test_slot_id, 1); -- DOIT RÉUSSIR (multi-staff)
  
  RAISE NOTICE '✅ TEST MULTI-STAFF: 2 RDV au même time_slot OK';
  
  -- Cleanup
  DELETE FROM appointment_slots WHERE appointment_id IN (test_appt1_id, test_appt2_id);
  DELETE FROM appointments WHERE id IN (test_appt1_id, test_appt2_id);
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ TEST ÉCHOUÉ: %', SQLERRM;
  ROLLBACK;
END $$;

-- Test 2 : Un RDV ne peut pas référencer deux fois le même time_slot
DO $$
DECLARE
  test_salon_id UUID;
  test_service_id UUID;
  test_slot_id UUID;
  test_appt_id UUID;
BEGIN
  SELECT id INTO test_salon_id FROM salons WHERE is_active = true LIMIT 1;
  SELECT id INTO test_service_id FROM services WHERE salon_id = test_salon_id LIMIT 1;
  SELECT id INTO test_slot_id FROM time_slots WHERE salon_id = test_salon_id AND is_available = true LIMIT 1;
  
  INSERT INTO appointments (salon_id, service_id, customer_name, customer_email, appointment_date, start_time, end_time, status)
  VALUES (test_salon_id, test_service_id, 'Test', 'test@test.com', CURRENT_DATE + 1, '10:00', '10:30', 'pending')
  RETURNING id INTO test_appt_id;
  
  -- Première insertion OK
  INSERT INTO appointment_slots (appointment_id, time_slot_id, slot_order)
  VALUES (test_appt_id, test_slot_id, 1);
  
  -- Deuxième insertion avec même time_slot DOIT ÉCHOUER
  BEGIN
    INSERT INTO appointment_slots (appointment_id, time_slot_id, slot_order)
    VALUES (test_appt_id, test_slot_id, 2); -- DOIT ÉCHOUER
    
    RAISE WARNING '❌ TEST ÉCHOUÉ: Doublon time_slot non bloqué';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ TEST DOUBLON: Contrainte UNIQUE fonctionne';
  END;
  
  -- Cleanup
  DELETE FROM appointment_slots WHERE appointment_id = test_appt_id;
  DELETE FROM appointments WHERE id = test_appt_id;
  
END $$;
*/

-- ===================================================
-- 6. STATS POST-MIGRATION
-- ===================================================

DO $$
DECLARE
  total_appointment_slots INTEGER;
  unique_time_slots INTEGER;
  shared_time_slots INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_appointment_slots FROM appointment_slots;
  
  -- Time slots uniques
  SELECT COUNT(DISTINCT time_slot_id) INTO unique_time_slots FROM appointment_slots;
  
  -- Time slots partagés par plusieurs RDV
  SELECT COUNT(*) INTO shared_time_slots
  FROM (
    SELECT time_slot_id, COUNT(DISTINCT appointment_id) as appt_count
    FROM appointment_slots
    GROUP BY time_slot_id
    HAVING COUNT(DISTINCT appointment_id) > 1
  ) shared;
  
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  MIGRATION 019 : FIX appointment_slots multi-staff    ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Total appointment_slots : %                          ║', LPAD(total_appointment_slots::TEXT, 28);
  RAISE NOTICE '║  Time slots uniques      : %                          ║', LPAD(unique_time_slots::TEXT, 28);
  RAISE NOTICE '║  Time slots partagés     : %                          ║', LPAD(shared_time_slots::TEXT, 28);
  RAISE NOTICE '║                                                        ║';
  RAISE NOTICE '║  ✅ Multi-staff supporté (plus de contrainte globale) ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
END $$;

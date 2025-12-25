-- ===================================================
-- SEED LOCAL SUPABASE — DÉMO SALON
-- ===================================================
-- ⚠️ LOCAL ONLY — NEVER RUN IN PROD
-- Compatible avec supabase db reset
-- ===================================================

-- ===================================================
-- 1. CLEAN DATABASE
-- ===================================================

TRUNCATE TABLE
  appointment_slots,
  appointments,
  time_slots,
  opening_time_ranges,
  opening_days,
  services,
  service_categories,
  salons
CASCADE;

-- ===================================================
-- 2. SALON
-- ===================================================

INSERT INTO salons (id, name, slug, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Salon Patricia Osores',
  'salon-patricia-osores',
  true
);

-- -- ===================================================
-- -- 3. SERVICE CATEGORIES
-- -- ===================================================

-- INSERT INTO service_categories (id, salon_id, name, color, position) VALUES
-- ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Coupe Femme', '#FF6B9D', 1),
-- ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Coupe Homme', '#4A90E2', 2),
-- ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Coloration', '#9B59B6', 3),
-- ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Soins', '#2ECC71', 4);

-- -- ===================================================
-- -- 4. SERVICES
-- -- ===================================================

-- INSERT INTO services (
--   salon_id,
--   category_id,
--   name,
--   description,
--   duration_minutes,
--   price_type,
--   price_value,
--   is_visible,
--   is_featured,
--   position
-- ) VALUES
-- -- Coupe Femme
-- ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
--  'Coupe + Brushing', 'Coupe personnalisée avec brushing', 60, 'fixed', 45, true, true, 1),

-- ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
--  'Coupe Simple', 'Coupe aux ciseaux', 30, 'fixed', 30, true, false, 2),

-- -- Coupe Homme
-- ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
--  'Coupe Homme', 'Tondeuse + ciseaux', 30, 'fixed', 25, true, true, 1),

-- ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
--  'Coupe + Barbe', 'Coupe + taille barbe', 45, 'fixed', 35, true, false, 2),

-- -- Coloration
-- ('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
--  'Coloration complète', 'Coloration cheveux longs', 120, 'from', 80, true, false, 1);

-- -- ===================================================
-- -- 5. OPENING DAYS
-- -- ===================================================

-- INSERT INTO opening_days (salon_id, day_of_week, is_open) VALUES
-- ('00000000-0000-0000-0000-000000000001', 1, true),
-- ('00000000-0000-0000-0000-000000000001', 2, true),
-- ('00000000-0000-0000-0000-000000000001', 3, true),
-- ('00000000-0000-0000-0000-000000000001', 4, true),
-- ('00000000-0000-0000-0000-000000000001', 5, true),
-- ('00000000-0000-0000-0000-000000000001', 6, false),
-- ('00000000-0000-0000-0000-000000000001', 0, false);

-- -- ===================================================
-- -- 6. OPENING TIME RANGES
-- -- ===================================================

-- INSERT INTO opening_time_ranges
-- (salon_id, day_of_week, start_time, end_time, slot_frequency_minutes)
-- VALUES
-- ('00000000-0000-0000-0000-000000000001', 1, '09:00', '12:00', 30),
-- ('00000000-0000-0000-0000-000000000001', 1, '14:00', '18:00', 30),
-- ('00000000-0000-0000-0000-000000000001', 2, '09:00', '18:00', 30),
-- ('00000000-0000-0000-0000-000000000001', 3, '09:00', '18:00', 30),
-- ('00000000-0000-0000-0000-000000000001', 4, '09:00', '19:00', 30),
-- ('00000000-0000-0000-0000-000000000001', 5, '09:00', '17:00', 30);

-- -- ===================================================
-- -- 7. GENERATE TIME SLOTS (14 DAYS)
-- -- ===================================================

-- DO $$
-- DECLARE
--   d DATE := CURRENT_DATE;
--   end_d DATE := CURRENT_DATE + 14;
--   r RECORD;
--   t TIME;
-- BEGIN
--   WHILE d <= end_d LOOP
--     FOR r IN
--       SELECT *
--       FROM opening_time_ranges
--       WHERE day_of_week = EXTRACT(ISODOW FROM d)
--     LOOP
--       t := r.start_time;
--       WHILE t < r.end_time LOOP
--         INSERT INTO time_slots (salon_id, slot_date, start_time)
--         VALUES (r.salon_id, d, t)
--         ON CONFLICT DO NOTHING;

--         t := t + make_interval(mins => r.slot_frequency_minutes);
--       END LOOP;
--     END LOOP;
--     d := d + 1;
--   END LOOP;
-- END $$;

-- -- ===================================================
-- -- 8. APPOINTMENTS
-- -- ===================================================

-- INSERT INTO appointments (
--   salon_id,
--   service_id,
--   customer_name,
--   customer_phone,
--   appointment_date,
--   start_time,
--   status
-- )
-- SELECT
--   '00000000-0000-0000-0000-000000000001',
--   s.id,
--   'Sophie Martin',
--   '0472123456',
--   CURRENT_DATE + 1,
--   '10:00',
--   'accepted'
-- FROM services s
-- WHERE s.name = 'Coupe + Brushing'
-- LIMIT 1;

-- INSERT INTO appointments (
--   salon_id,
--   service_id,
--   customer_name,
--   customer_phone,
--   appointment_date,
--   start_time,
--   status
-- )
-- SELECT
--   '00000000-0000-0000-0000-000000000001',
--   s.id,
--   'Jean Dupont',
--   '0498765432',
--   CURRENT_DATE + 1,
--   '14:30',
--   'accepted'
-- FROM services s
-- WHERE s.name = 'Coupe Homme'
-- LIMIT 1;

-- INSERT INTO appointments (
--   salon_id,
--   service_id,
--   customer_name,
--   customer_phone,
--   appointment_date,
--   start_time,
--   status
-- )
-- SELECT
--   '00000000-0000-0000-0000-000000000001',
--   s.id,
--   'Marie Leroy',
--   '0471234567',
--   CURRENT_DATE + 2,
--   '09:00',
--   'pending'
-- FROM services s
-- WHERE s.name = 'Coloration complète'
-- LIMIT 1;

-- -- ===================================================
-- -- 9. LINK APPOINTMENTS → TIME SLOTS
-- -- ===================================================

-- DO $$
-- DECLARE
--   a RECORD;
--   slot RECORD;
--   slots_needed INT;
--   freq INT := 30;
--   i INT;
-- BEGIN
--   FOR a IN
--     SELECT ap.id, ap.appointment_date, ap.start_time, s.duration_minutes
--     FROM appointments ap
--     JOIN services s ON s.id = ap.service_id
--   LOOP
--     slots_needed := CEIL(a.duration_minutes::NUMERIC / freq);
--     i := 1;

--     FOR slot IN
--       SELECT id
--       FROM time_slots
--       WHERE slot_date = a.appointment_date
--         AND start_time >= a.start_time
--       ORDER BY start_time
--       LIMIT slots_needed
--     LOOP
--       INSERT INTO appointment_slots (appointment_id, time_slot_id, slot_order)
--       VALUES (a.id, slot.id, i);

--       UPDATE time_slots
--       SET is_available = false
--       WHERE id = slot.id;

--       i := i + 1;
--     END LOOP;
--   END LOOP;
-- END $$;

-- ===================================================
-- 007_rls.sql
-- Row Level Security (RLS) — VERSION STABLE FINALE
-- ===================================================

-- ===================================================
-- HELPERS
-- ===================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.role() = 'authenticated'
    AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin() IS 'Returns true if current user has admin role';

-- ===================================================
-- SALONS
-- ===================================================
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salons_select_public" ON salons;
CREATE POLICY "salons_select_public"
ON salons FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "salons_all_admin" ON salons;
CREATE POLICY "salons_all_admin"
ON salons FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ===================================================
-- SERVICE CATEGORIES — RLS FINAL (ALIGNÉ ADMIN)
-- ===================================================

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- SELECT public
DROP POLICY IF EXISTS "service_categories_select_public" ON service_categories;
CREATE POLICY "service_categories_select_public"
ON service_categories
FOR SELECT
USING (deleted_at IS NULL);

-- SELECT admin
DROP POLICY IF EXISTS "service_categories_select_admin" ON service_categories;
CREATE POLICY "service_categories_select_admin"
ON service_categories
FOR SELECT
USING (is_admin());

-- INSERT admin
DROP POLICY IF EXISTS "service_categories_insert_admin" ON service_categories;
CREATE POLICY "service_categories_insert_admin"
ON service_categories
FOR INSERT
WITH CHECK (is_admin());

-- UPDATE admin
DROP POLICY IF EXISTS "service_categories_update_admin" ON service_categories;
CREATE POLICY "service_categories_update_admin"
ON service_categories
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- DELETE admin
DROP POLICY IF EXISTS "service_categories_delete_admin" ON service_categories;
CREATE POLICY "service_categories_delete_admin"
ON service_categories
FOR DELETE
USING (is_admin());

-- ===================================================
-- SERVICES
-- ===================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_public" ON services;
CREATE POLICY "services_select_public"
ON services FOR SELECT
USING (is_visible = TRUE AND deleted_at IS NULL);

DROP POLICY IF EXISTS "services_all_admin" ON services;
CREATE POLICY "services_all_admin"
ON services FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ===================================================
-- OPENING DAYS
-- ===================================================
ALTER TABLE opening_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opening_days_select_public" ON opening_days;
CREATE POLICY "opening_days_select_public"
ON opening_days FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "opening_days_all_admin" ON opening_days;
CREATE POLICY "opening_days_all_admin"
ON opening_days FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ===================================================
-- OPENING TIME RANGES
-- ===================================================
ALTER TABLE opening_time_ranges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opening_time_ranges_select_public" ON opening_time_ranges;
CREATE POLICY "opening_time_ranges_select_public"
ON opening_time_ranges FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "opening_time_ranges_all_admin" ON opening_time_ranges;
CREATE POLICY "opening_time_ranges_all_admin"
ON opening_time_ranges FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ===================================================
-- EXCEPTIONAL PERIODS
-- ===================================================
ALTER TABLE exceptional_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exceptional_periods_select_public" ON exceptional_periods;
CREATE POLICY "exceptional_periods_select_public"
ON exceptional_periods FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "exceptional_periods_all_admin" ON exceptional_periods;
CREATE POLICY "exceptional_periods_all_admin"
ON exceptional_periods FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ===================================================
-- TIME SLOTS
-- ===================================================
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_slots_select_public" ON time_slots;
CREATE POLICY "time_slots_select_public"
ON time_slots FOR SELECT
USING (is_available = TRUE);

DROP POLICY IF EXISTS "time_slots_update_booking" ON time_slots;
CREATE POLICY "time_slots_update_booking"
ON time_slots FOR UPDATE
USING (
  is_admin()
  OR is_available = TRUE
)
WITH CHECK (
  is_admin()
  OR is_available = FALSE
);

DROP POLICY IF EXISTS "time_slots_all_admin" ON time_slots;
CREATE POLICY "time_slots_all_admin"
ON time_slots FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ===================================================
-- APPOINTMENTS (FIX FINAL)
-- ===================================================
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- INSERT public (prise de RDV)
DROP POLICY IF EXISTS "appointments_insert_public" ON appointments;
CREATE POLICY "appointments_insert_public"
ON appointments FOR INSERT
WITH CHECK (TRUE);

-- SELECT: admin voit tout, public voit uniquement les RDV avec proposition (pour la page du mail)
DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select"
ON appointments FOR SELECT
USING (
  is_admin()
  OR (
    status = 'pending'
    AND proposed_date IS NOT NULL
    AND proposed_start_time IS NOT NULL
  )
);

-- IMPORTANT: supprimer TOUTES les policies UPDATE existantes qui traînent
DROP POLICY IF EXISTS "appointments_update_admin" ON appointments;
DROP POLICY IF EXISTS "appointments_update_reschedule" ON appointments;
DROP POLICY IF EXISTS "appointments_update" ON appointments;

-- ✅ UNE SEULE policy UPDATE: admin OU validation reschedule
CREATE POLICY "appointments_update"
ON appointments FOR UPDATE
USING (
  -- Admin : peut update tout
  is_admin()
  OR
  -- Public : peut update seulement si RDV est en pending + proposition existe
  (
    status = 'pending'
    AND proposed_date IS NOT NULL
    AND proposed_start_time IS NOT NULL
  )
)
WITH CHECK (
  -- Admin : OK
  is_admin()
  OR
  -- Public : après update, on accepte seulement un résultat "propre"
  (
    status IN ('accepted', 'refused')
    AND proposed_date IS NULL
    AND proposed_start_time IS NULL
  )
);


-- ===================================================
-- APPOINTMENT SLOTS
-- ===================================================
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_slots_insert_public" ON appointment_slots;
CREATE POLICY "appointment_slots_insert_public"
ON appointment_slots FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "appointment_slots_all_admin" ON appointment_slots;
CREATE POLICY "appointment_slots_all_admin"
ON appointment_slots FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

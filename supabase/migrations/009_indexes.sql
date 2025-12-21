-- ===================================================
-- 006_indexes.sql
-- Indexes de performance (calendrier / réservation)
-- ===================================================

-- ===================================================
-- SALONS
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_salons_slug
ON salons(slug);

CREATE INDEX IF NOT EXISTS idx_salons_active
ON salons(is_active);

-- ============================================
-- SERVICE CATEGORIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_service_categories_salon
ON service_categories(salon_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_categories_position
ON service_categories(position)
WHERE deleted_at IS NULL;

-- ============================================
-- SERVICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_services_salon
ON services(salon_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_services_category
ON services(category_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_services_position
ON services(position)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_services_featured
ON services(is_featured)
WHERE is_featured = TRUE AND deleted_at IS NULL;


-- ===================================================
-- OPENING DAYS
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_opening_days_salon_day
ON opening_days(salon_id, day_of_week);

-- ===================================================
-- OPENING TIME RANGES
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_opening_time_ranges_salon_day
ON opening_time_ranges(salon_id, day_of_week);

-- ===================================================
-- EXCEPTIONAL PERIODS
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_exceptional_periods_salon_dates
ON exceptional_periods(salon_id, start_date, end_date);

-- ===================================================
-- TIME SLOTS (CRÉNEAUX)
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_time_slots_salon_date
ON time_slots(salon_id, slot_date);

CREATE INDEX IF NOT EXISTS idx_time_slots_available
ON time_slots(is_available)
WHERE is_available = TRUE;

-- ===================================================
-- APPOINTMENTS
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_appointments_salon_date
ON appointments(salon_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status
ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_created_at
ON appointments(created_at DESC);

-- ===================================================
-- APPOINTMENT SLOTS
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_appointment_slots_appointment
ON appointment_slots(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_slots_time_slot
ON appointment_slots(time_slot_id);

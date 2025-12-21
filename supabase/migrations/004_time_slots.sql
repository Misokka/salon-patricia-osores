-- ===================================================
-- 004_time_slots.sql
-- Créneaux horaires générés
-- ===================================================

CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,

  is_available BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT time_slots_unique
    UNIQUE (salon_id, slot_date, start_time)
);

COMMENT ON TABLE time_slots IS 'Generated bookable time slots for a salon';
COMMENT ON COLUMN time_slots.slot_date IS 'Date of the slot';
COMMENT ON COLUMN time_slots.start_time IS 'Start time of the slot';
COMMENT ON COLUMN time_slots.is_available IS 'True if the slot is free';

-- ===================================================
-- TRIGGER updated_at
-- ===================================================

CREATE TRIGGER trg_time_slots_updated_at
BEFORE UPDATE ON time_slots
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

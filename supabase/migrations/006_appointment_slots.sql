-- ===================================================
-- 005b_appointment_slots.sql
-- Liaison rendez-vous ↔ créneaux
-- ===================================================

CREATE TABLE IF NOT EXISTS appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  appointment_id UUID NOT NULL
    REFERENCES appointments(id) ON DELETE CASCADE,

  time_slot_id UUID NOT NULL
    REFERENCES time_slots(id) ON DELETE CASCADE,

  slot_order INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_appointment_slot_order
    UNIQUE (appointment_id, slot_order),

  CONSTRAINT unique_time_slot
    UNIQUE (time_slot_id)
);

COMMENT ON TABLE appointment_slots IS 'Links appointments to reserved time slots';
COMMENT ON COLUMN appointment_slots.slot_order IS 'Order of slot in appointment (1,2,3...)';

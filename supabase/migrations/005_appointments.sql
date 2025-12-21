-- ===================================================
-- 005_appointments.sql
-- Rendez-vous clients
-- ===================================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),

  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT, -- optionnel (admin peut créer sans email)

  -- Origine du rendez-vous
  origin TEXT NOT NULL DEFAULT 'client'
    CHECK (origin IN ('client', 'admin')),

  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'refused', 'cancelled')),

  -- Reschedule workflow
  proposed_date DATE,
  proposed_start_time TIME,

  -- Review tracking
  review_request_sent BOOLEAN DEFAULT false,
  review_request_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE appointments IS 'Customer appointments';

COMMENT ON COLUMN appointments.origin IS
'Origin of appointment creation: client (online booking) or admin (manual entry)';

COMMENT ON COLUMN appointments.customer_email IS
'Client email. Required for client bookings, optional for admin-created appointments';

COMMENT ON COLUMN appointments.status IS
'pending, accepted, refused, cancelled';

COMMENT ON COLUMN appointments.proposed_date IS
'Proposed new date waiting customer approval';

COMMENT ON COLUMN appointments.proposed_start_time IS
'Proposed new time waiting customer approval';

-- ===================================================
-- TRIGGER updated_at
-- ===================================================

CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

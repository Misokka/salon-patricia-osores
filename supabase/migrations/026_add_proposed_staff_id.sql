-- ===================================================
-- 026_add_proposed_staff_id.sql
-- Add proposed_staff_id column for reschedule workflow
-- ===================================================

-- Add proposed_staff_id column to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS proposed_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.proposed_staff_id IS
'Proposed new staff member waiting customer approval during reschedule';

-- ===================================================
-- Migration 022: Fix RPC functions - Remove is_available filter
-- ===================================================
-- Avec le système multi-staff, is_available reste toujours true
-- car plusieurs coiffeurs peuvent travailler simultanément.
-- La disponibilité est calculée dynamiquement par slot/staff.
-- ===================================================

-- 1. Fix get_available_slots_for_date
CREATE OR REPLACE FUNCTION get_available_slots_for_date(
  p_salon_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  start_time TIME,
  available_staff_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH slots AS (
    SELECT 
      ts.start_time,
      count_available_staff_for_slot(
        p_salon_id,
        p_date,
        ts.start_time,
        p_duration_minutes
      ) AS available_staff_count
    FROM time_slots ts
    WHERE ts.salon_id = p_salon_id
      AND ts.slot_date = p_date
      -- ⚠️ SUPPRESSION du filtre is_available = true
      -- La disponibilité est calculée par count_available_staff_for_slot()
  )
  SELECT s.start_time, s.available_staff_count
  FROM slots s
  WHERE s.available_staff_count > 0
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_slots_for_date IS 
'Returns all time slots for a date with count of available staff for each.
Multi-staff: is_available filter removed, availability calculated per slot/staff.';


-- 2. Fix get_available_slots_for_staff
CREATE OR REPLACE FUNCTION get_available_slots_for_staff(
  p_salon_id UUID,
  p_staff_member_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  start_time TIME,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.start_time,
    is_staff_available_for_slot(
      p_staff_member_id,
      p_salon_id,
      p_date,
      ts.start_time,
      p_duration_minutes
    ) AS is_available
  FROM time_slots ts
  WHERE ts.salon_id = p_salon_id
    AND ts.slot_date = p_date
    -- ⚠️ SUPPRESSION du filtre is_available = true
    -- La disponibilité est calculée par is_staff_available_for_slot()
    AND is_staff_available_for_slot(
      p_staff_member_id,
      p_salon_id,
      p_date,
      ts.start_time,
      p_duration_minutes
    ) = true
  ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_slots_for_staff IS 
'Returns available time slots for a SPECIFIC staff member on a given date.
Step 6: Used when client has selected a specific hairdresser.
Only returns slots where that staff member is available (no overlapping appointments, no absences).
Multi-staff: is_available filter removed, availability calculated per staff.';

GRANT EXECUTE ON FUNCTION get_available_slots_for_staff TO anon, authenticated;

-- ===================================================
-- 003_opening_hours.sql
-- Gestion des horaires d'ouverture des salons
-- ===================================================

-- ===================================================
-- OPENING DAYS (jours ouverts / fermés)
-- ===================================================

CREATE TABLE IF NOT EXISTS opening_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  day_of_week SMALLINT NOT NULL
    CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Monday

  is_open BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT opening_days_unique
    UNIQUE (salon_id, day_of_week)
);

COMMENT ON TABLE opening_days IS 'Defines which days of the week the salon is open';

-- ===================================================
-- OPENING TIME RANGES (plages horaires standards)
-- ===================================================

CREATE TABLE IF NOT EXISTS opening_time_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  day_of_week SMALLINT NOT NULL
    CHECK (day_of_week BETWEEN 0 AND 6),

  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  slot_frequency_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (slot_frequency_minutes > 0),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT opening_time_valid_range
    CHECK (end_time > start_time)
);

COMMENT ON TABLE opening_time_ranges IS 'Standard opening time ranges per weekday';

-- ===================================================
-- EXCEPTIONAL PERIODS (ouvertures / fermetures exceptionnelles)
-- ===================================================

CREATE TABLE IF NOT EXISTS exceptional_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  type TEXT NOT NULL
    CHECK (type IN ('open', 'closed')),

  reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT exceptional_periods_date_range
    CHECK (end_date >= start_date)
);

COMMENT ON TABLE exceptional_periods IS 'Exceptional opening or closing periods';

-- ===================================================
-- EXCEPTIONAL TIME RANGES (plages horaires exceptionnelles)
-- ===================================================

CREATE TABLE IF NOT EXISTS exceptional_time_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exceptional_period_id UUID NOT NULL
    REFERENCES exceptional_periods(id) ON DELETE CASCADE,

  day_of_week SMALLINT
    CHECK (day_of_week BETWEEN 0 AND 6), -- NULL = every day

  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  slot_frequency_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (slot_frequency_minutes > 0),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT exceptional_time_valid_range
    CHECK (end_time > start_time)
);

COMMENT ON TABLE exceptional_time_ranges IS 'Time ranges for exceptional opening periods';

-- ===================================================
-- TRIGGERS : updated_at
-- ===================================================

CREATE TRIGGER trg_opening_days_updated_at
BEFORE UPDATE ON opening_days
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_opening_time_ranges_updated_at
BEFORE UPDATE ON opening_time_ranges
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_exceptional_periods_updated_at
BEFORE UPDATE ON exceptional_periods
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_exceptional_time_ranges_updated_at
BEFORE UPDATE ON exceptional_time_ranges
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

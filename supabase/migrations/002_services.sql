-- ===================================================
-- 002_services.sql
-- Gestion des catégories et services du salon
-- ===================================================

-- ===================================================
-- SERVICE CATEGORIES
-- ===================================================

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT,
  position INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT service_categories_unique_name
    UNIQUE (salon_id, name)
);

COMMENT ON TABLE service_categories IS 'Categories of services offered by a salon';
COMMENT ON COLUMN service_categories.position IS 'Display order inside a salon';

-- ===================================================
-- SERVICES
-- ===================================================

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),

  price_type TEXT NOT NULL
    CHECK (price_type IN ('fixed', 'from', 'quote')),

  price_value NUMERIC(10,2),

  is_visible BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  position INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT services_price_logic CHECK (
    (price_type = 'quote' AND price_value IS NULL)
    OR (price_type IN ('fixed', 'from') AND price_value IS NOT NULL)
  )
);

COMMENT ON TABLE services IS 'Services offered by a salon';
COMMENT ON COLUMN services.price_type IS 'fixed | from | quote';
COMMENT ON COLUMN services.is_featured IS 'Highlighted on homepage (max 3 recommended)';

-- ===================================================
-- TRIGGERS : updated_at
-- ===================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_categories_updated_at
BEFORE UPDATE ON service_categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ===================================================
-- BUSINESS RULE (OPTIONNEL MAIS RECOMMANDÉ)
-- Max 3 services featured par salon
-- ===================================================

CREATE OR REPLACE FUNCTION check_featured_services_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true THEN
    IF (
      SELECT COUNT(*)
      FROM services
      WHERE salon_id = NEW.salon_id
        AND is_featured = true
        AND deleted_at IS NULL
        AND id <> NEW.id
    ) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 featured services per salon';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_services_featured_limit
BEFORE INSERT OR UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION check_featured_services_limit();

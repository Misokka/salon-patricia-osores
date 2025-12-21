-- ============================================
-- 001_create_salons.sql
-- Base de tous les sites salons
-- ============================================

CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,              -- utilisé pour l’URL (ex: patricia-osores)
  name TEXT NOT NULL,                     -- nom du salon
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'BE',

  -- Configuration
  is_active BOOLEAN DEFAULT true,         -- permet désactiver un salon
  online_booking_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE salons IS 'Salons clients (1 salon = 1 site)';
COMMENT ON COLUMN salons.slug IS 'Identifiant public du salon (URL)';
COMMENT ON COLUMN salons.online_booking_enabled IS 'Active ou non la prise de RDV en ligne';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_salons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_salons_updated_at
BEFORE UPDATE ON salons
FOR EACH ROW
EXECUTE FUNCTION update_salons_updated_at();

-- Salon par défaut (DEV / DEMO)
INSERT INTO salons (slug, name)
VALUES ('default', 'Salon de démonstration')
ON CONFLICT (slug) DO NOTHING;

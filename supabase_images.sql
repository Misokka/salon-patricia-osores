-- ============================================
-- TABLES POUR LA GESTION DES IMAGES DU SALON
-- ============================================

-- 1. Ajouter la colonne image_url dans la table services
-- Cette colonne stocke l'URL publique de l'image du service featured
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN services.image_url IS 'URL publique de l''image du service (Supabase Storage). Utilisé uniquement si is_featured = true';

-- 2. Créer la table pour les images de la galerie de réalisations
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- Service associé optionnel
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Index pour l'ordre d'affichage
CREATE INDEX IF NOT EXISTS idx_gallery_images_order ON gallery_images("order") WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gallery_images_deleted ON gallery_images(deleted_at) WHERE deleted_at IS NULL;

-- Trigger pour gérer l'ordre automatiquement
CREATE OR REPLACE FUNCTION update_gallery_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."order" IS NULL OR NEW."order" = 0 THEN
    SELECT COALESCE(MAX("order"), 0) + 1 INTO NEW."order"
    FROM gallery_images
    WHERE deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_gallery_order
  BEFORE INSERT ON gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION update_gallery_order();

-- 3. Ajouter la colonne about_image_url dans salon_settings
ALTER TABLE salon_settings 
ADD COLUMN IF NOT EXISTS about_image_url TEXT;

COMMENT ON COLUMN salon_settings.about_image_url IS 'URL publique de l''image de la section À propos (Supabase Storage)';

-- 4. Activer Row Level Security sur gallery_images
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Policy : lecture publique
CREATE POLICY "Images galerie visibles par tous" 
  ON gallery_images 
  FOR SELECT 
  USING (deleted_at IS NULL);

-- Policy : admins peuvent tout gérer
CREATE POLICY "Admins peuvent gérer les images galerie" 
  ON gallery_images 
  FOR ALL 
  USING (true);

-- ============================================
-- COMMENTAIRES ET DOCUMENTATION
-- ============================================

COMMENT ON TABLE gallery_images IS 'Images de la galerie des réalisations du salon (max 6 affichées sur le site)';
COMMENT ON COLUMN gallery_images."order" IS 'Ordre d''affichage des images (1 = première, 6 = dernière)';
COMMENT ON COLUMN gallery_images.image_url IS 'URL publique depuis Supabase Storage (bucket: salon-images/gallery/)';

-- ============================================
-- BUCKET SUPABASE STORAGE (À CRÉER MANUELLEMENT)
-- ============================================
-- Nom du bucket : salon-images
-- Structure :
--   salon-images/
--   ├─ featured-services/    (images des 3 services mis en avant)
--   ├─ gallery/              (images de la galerie, max 6)
--   └─ about/                (image de la section À propos)
--
-- Politique d'accès :
--   - Lecture publique (authenticated + anon)
--   - Upload/Delete : admin uniquement

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Les URLs stockées sont des URLs publiques complètes depuis Supabase Storage
-- 2. Ne jamais stocker de fichier binaire en base, uniquement l'URL
-- 3. Limite de 6 images dans la galerie (à gérer côté admin UI)
-- 4. Pour les services : image_url utilisée seulement si is_featured = true
-- 5. Image hero : reste codée en dur dans salon.config.ts (hors scope)

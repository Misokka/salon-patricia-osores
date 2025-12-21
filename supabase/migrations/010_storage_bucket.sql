-- ===================================================
-- 011_storage_bucket.sql
-- Création du bucket Storage pour les images du salon
-- ===================================================

-- ===================================================
-- BUCKET
-- ===================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'salon-images',
  'salon-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ===================================================
-- RLS POLICIES — storage.objects
-- ===================================================

-- Lecture publique
DROP POLICY IF EXISTS "Public can read salon images" ON storage.objects;
CREATE POLICY "Public can read salon images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'salon-images');

-- Upload admin
DROP POLICY IF EXISTS "Admins can upload salon images" ON storage.objects;
CREATE POLICY "Admins can upload salon images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'salon-images'
  AND is_admin()
);

-- Update admin
DROP POLICY IF EXISTS "Admins can update salon images" ON storage.objects;
CREATE POLICY "Admins can update salon images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'salon-images'
  AND is_admin()
)
WITH CHECK (
  bucket_id = 'salon-images'
  AND is_admin()
);

-- Delete admin
DROP POLICY IF EXISTS "Admins can delete salon images" ON storage.objects;
CREATE POLICY "Admins can delete salon images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'salon-images'
  AND is_admin()
);

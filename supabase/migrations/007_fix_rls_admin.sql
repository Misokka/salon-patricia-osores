-- ===================================================
-- 010_fix_rls_admin.sql
-- Correction de la fonction is_admin() pour utiliser app_metadata
-- ===================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.role() = 'authenticated'
    AND COALESCE(
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin() IS
'Checks if the current user has admin role in app_metadata';

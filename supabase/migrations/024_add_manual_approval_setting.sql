-- ===================================================
-- Migration 024: Add manual appointment approval setting
-- ===================================================
-- Ajoute un paramètre pour activer/désactiver la validation manuelle des RDV
-- Par défaut TRUE (mode actuel) : admin doit valider
-- Si FALSE : RDV auto-accepté, client reçoit confirmation immédiate
-- ===================================================

ALTER TABLE salons 
ADD COLUMN IF NOT EXISTS require_manual_approval BOOLEAN DEFAULT true;

COMMENT ON COLUMN salons.require_manual_approval IS 
'Si TRUE, les rendez-vous clients sont en "pending" et nécessitent validation admin. 
Si FALSE, les rendez-vous sont automatiquement "accepted" à la réservation.';

-- Mettre à jour le salon par défaut
UPDATE salons 
SET require_manual_approval = true 
WHERE slug = 'default';

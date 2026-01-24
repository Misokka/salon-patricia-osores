-- Migration 025: Ajouter management_token pour permettre aux clients de gérer leurs RDV

-- Ajouter le champ management_token dans appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS management_token VARCHAR(64);

-- Générer un token pour les RDV existants
UPDATE appointments
SET management_token = md5(random()::text || clock_timestamp()::text)
WHERE management_token IS NULL;

-- Créer un index pour accélérer les recherches par token
CREATE INDEX IF NOT EXISTS idx_appointments_management_token ON appointments(management_token);

-- Commentaire
COMMENT ON COLUMN appointments.management_token IS 'Token sécurisé permettant au client de gérer son RDV (modifier/annuler) sans authentification';

/**
 * Service de récupération du salon depuis la session utilisateur
 * Source de vérité : user.app_metadata.salon_id
 */

import { createClient } from '@/lib/supabase/server'

/**
 * UUID du salon pour les routes publiques (non authentifiées)
 * TODO: En mode multi-salon, remplacer par une détection par domaine/slug
 */
export const PUBLIC_SALON_ID = 'e0b7b419-a22b-4c2c-8355-2f4af30fe1c2'

/**
 * Récupère le salon_id depuis la session utilisateur authentifié
 * Utilisé uniquement pour les routes admin
 * 
 * @returns salon_id de l'utilisateur
 * @throws Error si l'utilisateur n'est pas authentifié ou n'a pas de salon_id
 */
export async function getSalonIdFromAuth(): Promise<string> {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Utilisateur non authentifié')
  }

  const salonId = user.app_metadata?.salon_id

  if (!salonId) {
    throw new Error('Aucun salon_id trouvé dans les métadonnées utilisateur')
  }

  return salonId
}

/**
 * Service de récupération du salon actif
 * Centralise la logique de récupération du salon_id
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// UUID du salon par défaut (depuis seed.sql)
const DEFAULT_SALON_ID = 'e0b7b419-a22b-4c2c-8355-2f4af30fe1c2'

/**
 * Récupère l'ID du salon actif par son slug
 * En production, on pourrait avoir plusieurs salons
 */
export async function getSalonId(slug: string = 'default'): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('salons')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.warn(`Salon "${slug}" non trouvé, utilisation de l'ID par défaut`)
      return DEFAULT_SALON_ID
    }

    return data.id
  } catch (err) {
    console.error('Erreur récupération salon_id:', err)
    return DEFAULT_SALON_ID
  }
}

/**
 * Retourne directement l'UUID hardcodé du salon par défaut
 * Utilisé pour éviter les appels async inutiles en local
 */
export function getDefaultSalonId(): string {
  return DEFAULT_SALON_ID
}

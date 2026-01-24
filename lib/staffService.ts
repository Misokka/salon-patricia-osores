import { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Récupère l'ID du staff member par défaut pour un salon.
 * Utilisé pour l'auto-assignation des RDV (étape 2).
 * 
 * Logique de sélection :
 * 1. Premier membre actif par position
 * 2. Si aucun actif trouvé, retourne null
 * 
 * @param salonId - UUID du salon
 * @param client - Client Supabase (optionnel, utilise supabaseAdmin par défaut)
 * @returns L'ID du staff member par défaut ou null
 */
export async function getDefaultStaffMemberId(
  salonId: string,
  client?: SupabaseClient
): Promise<string | null> {
  const supabase = client || supabaseAdmin

  const { data, error } = await supabase
    .from('staff_members')
    .select('id')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getDefaultStaffMemberId] Error:', error)
    return null
  }

  return data?.id || null
}

/**
 * Récupère tous les staff members actifs d'un salon.
 * Utilisé pour le calcul de disponibilité multi-staff (étape 2+).
 * 
 * @param salonId - UUID du salon
 * @param client - Client Supabase (optionnel, utilise supabaseAdmin par défaut)
 * @returns Liste des staff members actifs
 */
export async function getActiveStaffMembers(
  salonId: string,
  client?: SupabaseClient
): Promise<Array<{ id: string; name: string; position: number }>> {
  const supabase = client || supabaseAdmin

  const { data, error } = await supabase
    .from('staff_members')
    .select('id, name, position')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .order('position', { ascending: true })

  if (error) {
    console.error('[getActiveStaffMembers] Error:', error)
    return []
  }

  return data || []
}

/**
 * Vérifie si un salon a au moins un staff member actif.
 * 
 * @param salonId - UUID du salon
 * @param client - Client Supabase (optionnel)
 * @returns true si au moins un membre actif existe
 */
export async function hasActiveStaffMember(
  salonId: string,
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = client || supabaseAdmin

  const { count, error } = await supabase
    .from('staff_members')
    .select('id', { count: 'exact', head: true })
    .eq('salon_id', salonId)
    .eq('is_active', true)

  if (error) {
    console.error('[hasActiveStaffMember] Error:', error)
    return false
  }

  return (count ?? 0) > 0
}

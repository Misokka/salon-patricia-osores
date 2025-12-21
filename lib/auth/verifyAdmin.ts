import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Vérifie si l'utilisateur est authentifié et a le rôle admin
 * Retourne l'utilisateur + salon_id si valide, sinon retourne une réponse d'erreur
 */
export async function verifyAdminAuth() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()

    // Vérifier si l'utilisateur est connecté
    if (error || !user) {
      return {
        user: null,
        salonId: null,
        error: NextResponse.json(
          { success: false, error: 'Non authentifié' },
          { status: 401 }
        )
      }
    }

    // Vérifier si l'utilisateur a le rôle admin
    const userRole = user.app_metadata?.role
    if (userRole !== 'admin') {
      return {
        user: null,
        salonId: null,
        error: NextResponse.json(
          { success: false, error: 'Accès non autorisé' },
          { status: 403 }
        )
      }
    }

    // Récupérer le salon_id
    const salonId = user.app_metadata?.salon_id
    if (!salonId) {
      return {
        user: null,
        salonId: null,
        error: NextResponse.json(
          { success: false, error: 'Aucun salon associé à cet utilisateur' },
          { status: 403 }
        )
      }
    }

    // Utilisateur valide
    return { user, salonId, error: null }
  } catch (err) {
    console.error('[verifyAdminAuth] Exception:', err);
    return {
      user: null,
      salonId: null,
      error: NextResponse.json(
        { success: false, error: 'Erreur serveur lors de la vérification' },
        { status: 500 }
      )
    }
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Vérifie si l'utilisateur est authentifié et a le rôle admin
 * Retourne l'utilisateur si valide, sinon retourne une réponse d'erreur
 */
export async function verifyAdminAuth() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()

    console.log('[verifyAdminAuth] User:', user?.id, 'Error:', error?.message);

    // Vérifier si l'utilisateur est connecté
    if (error || !user) {
      console.error('[verifyAdminAuth] Non authentifié:', error);
      return {
        user: null,
        error: NextResponse.json(
          { success: false, error: 'Non authentifié' },
          { status: 401 }
        )
      }
    }

    // Vérifier si l'utilisateur a le rôle admin (dans app_metadata, pas user_metadata)
    const userRole = user.app_metadata?.role
    console.log('[verifyAdminAuth] User role:', userRole);
    
    if (userRole !== 'admin') {
      console.error('[verifyAdminAuth] Rôle invalide:', userRole);
      return {
        user: null,
        error: NextResponse.json(
          { success: false, error: 'Accès non autorisé' },
          { status: 403 }
        )
      }
    }

    console.log('[verifyAdminAuth] ✅ Admin verified:', user.email);
    // Utilisateur valide
    return { user, error: null }
  } catch (err) {
    console.error('[verifyAdminAuth] Exception:', err);
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'Erreur serveur lors de la vérification' },
        { status: 500 }
      )
    }
  }
}

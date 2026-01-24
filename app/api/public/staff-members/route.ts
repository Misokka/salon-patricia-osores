export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PUBLIC_SALON_ID } from '@/lib/salonContext'

/**
 * GET - Récupère les membres d'équipe actifs du salon (endpoint public)
 * 
 * Utilisé par le flow de réservation client pour afficher
 * la liste "Choisir votre coiffeur (optionnel)"
 * 
 * 🔒 SECURITY: salon_id résolu depuis config serveur, pas d'injection
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const salonId = PUBLIC_SALON_ID

    const { data: staffMembers, error } = await supabase
      .from('staff_members')
      .select('id, name, position')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('[GET /api/public/staff-members] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération de l\'équipe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: staffMembers || []
    })
  } catch (error) {
    console.error('[GET /api/public/staff-members] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

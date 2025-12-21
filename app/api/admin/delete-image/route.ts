export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'

/**
 * DELETE - Supprime une image de Supabase Storage
 * 
 * Query params:
 * - path: chemin du fichier dans le bucket (ex: gallery/123456-abc.jpg)
 * - serviceId?: string (optionnel, pour clear services.image_url)
 * 
 * Returns:
 * - success: boolean
 */
export async function DELETE(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const serviceId = searchParams.get('serviceId')

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Chemin du fichier manquant' },
        { status: 400 }
      )
    }

    // Supprimer de Supabase Storage avec auth admin
    
    const { error: deleteError } = await supabaseAdmin
      .storage
      .from('salon-images')
      .remove([path])

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression de l\'image' },
        { status: 500 }
      )
    }

    // Si c'est pour un service, clear le champ image_url
    if (serviceId) {
      const { error: updateError } = await supabaseAdmin
        .from('services')
        .update({ image_url: null })
        .eq('id', serviceId)

      if (updateError) {
        // On ne rollback pas la suppression, juste un warning
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Image supprimée avec succès'
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

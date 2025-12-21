export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../../lib/auth/verifyAdmin'

/**
 * GET — Récupère l'image "À propos"
 * Règle : images.type = 'about'
 */
export async function GET() {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { data, error } = await supabaseAdmin
      .from('images')
      .select('image_url')
      .eq('salon_id', salonId)
      .eq('type', 'about')
      .is('deleted_at', null)
      .single()

    // PGRST116 = aucune ligne (normal si pas d’image)
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération de l’image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: data?.image_url ?? null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — Crée / met à jour / supprime l'image "À propos"
 */
export async function PATCH(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
    const { imageUrl } = await request.json()

    /**
     * SUPPRESSION (soft delete)
     */
    if (!imageUrl) {
      const { error } = await supabaseAdmin
        .from('images')
        .update({ deleted_at: new Date().toISOString() })
        .eq('salon_id', salonId)
        .eq('type', 'about')
        .is('deleted_at', null)

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la suppression' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Image À propos supprimée',
        data: { imageUrl: null },
      })
    }

    /**
     * UPSERT
     */
    const { data: existing } = await supabaseAdmin
      .from('images')
      .select('id')
      .eq('salon_id', salonId)
      .eq('type', 'about')
      .is('deleted_at', null)
      .single()

    let result

    if (existing) {
      // UPDATE
      const { data, error } = await supabaseAdmin
        .from('images')
        .update({
          image_url: imageUrl,
          alt_text: 'Image section À propos',
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la mise à jour' },
          { status: 500 }
        )
      }

      result = data
    } else {
      // INSERT
      const { data, error } = await supabaseAdmin
        .from('images')
        .insert({
          salon_id: salonId,
          service_id: null,
          type: 'about',
          image_url: imageUrl,
          alt_text: 'Image section À propos',
          position: 0,
          is_visible: true,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la création' },
          { status: 500 }
        )
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      message: 'Image À propos mise à jour',
      data: { imageUrl: result.image_url },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

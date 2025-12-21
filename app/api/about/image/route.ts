import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_SALON_ID } from '../../../../lib/salonContext'

/**
 * GET — Récupère l'image "À propos" (PUBLIC)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const salonId = PUBLIC_SALON_ID

    console.log('[GET /api/about/image] Fetching for salon:', salonId)

    const { data, error } = await supabase
      .from('images')
      .select('image_url, alt_text')
      .eq('salon_id', salonId)
      .eq('type', 'about')
      .eq('is_visible', true)
      .is('deleted_at', null)
      .single()

    console.log('[GET /api/about/image] Result:', { data, error: error?.message })

    // PGRST116 = aucune ligne (normal si pas d'image)
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération de l\'image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: data?.image_url ?? null,
        altText: data?.alt_text ?? null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

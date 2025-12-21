import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../lib/salonContext'

/**
 * GET - Récupère les services featured (mis en avant)
 */
export async function GET() {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const salonId = getDefaultSalonId()

    const { data, error } = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price_type,
        price_value,
        is_featured,
        position,
        service_categories (
          id,
          name,
          color
        ),
        images (
          id,
          image_url,
          alt_text,
          type,
          deleted_at
        )
      `)
      .eq('salon_id', salonId)
      .eq('is_featured', true)
      .is('deleted_at', null)
      .order('position', { ascending: true })


    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des services' },
        { status: 500 }
      )
    }

    // Normaliser pour ne retourner que l'image service_featured active
    const normalized = (data || []).map(service => {
      const featuredImage = service.images?.find(
        (img: any) => img.type === 'service_featured' && img.deleted_at === null
      ) || null

      return {
        ...service,
        image: featuredImage ? {
          id: featuredImage.id,
          image_url: featuredImage.image_url,
          alt_text: featuredImage.alt_text,
        } : null,
        images: undefined, // Retirer le tableau complet
      }
    })

    return NextResponse.json({
      success: true,
      data: normalized,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

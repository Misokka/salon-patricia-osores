import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDefaultSalonId } from '../../../lib/salonContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FEATURED_IMAGE_TYPE = 'service_featured'

export async function GET() {
  try {
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
        service_categories (
          name
        ),
        images (
          id,
          image_url,
          alt_text,
          type,
          deleted_at,
          is_visible
        )
      `)
      .eq('salon_id', salonId)
      .eq('is_visible', true)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur récupération services' },
        { status: 500 }
      )
    }

    const normalizeService = (s: any) => {
      const featuredImage =
        s.images?.find(
          (img: any) =>
            img.type === FEATURED_IMAGE_TYPE &&
            img.deleted_at === null &&
            img.is_visible === true
        ) || null

      return {
        id: s.id,
        name: s.name,
        description: s.description,
        duration_minutes: s.duration_minutes,
        price_type: s.price_type,
        price_value: s.price_value,
        is_featured: s.is_featured,
        category_name: s.service_categories?.name ?? null,
        image: featuredImage
          ? {
              id: featuredImage.id,
              image_url: featuredImage.image_url,
              alt_text: featuredImage.alt_text,
            }
          : null,
      }
    }

    const all = data.map(normalizeService)
    const featured = all.filter(s => s.is_featured).slice(0, 3)

    return NextResponse.json({
      success: true,
      data: {
        featured,
        all,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

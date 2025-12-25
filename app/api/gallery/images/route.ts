import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_SALON_ID } from '@/lib/salonContext'

const IMAGE_TYPE = 'gallery'

/**
 * GET — Galerie publique
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('images')
      .select(`
        id,
        image_url,
        alt_text,
        position,
        services (
          id,
          name
        )
      `)
      .eq('salon_id', PUBLIC_SALON_ID)
      .eq('type', IMAGE_TYPE)
      .is('deleted_at', null)
      .is('is_visible', true)
      .order('position', { ascending: true })
      .limit(6)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur récupération galerie' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST — Ajout d'une image à la galerie (ADMIN)
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // 1️⃣ Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 2️⃣ Salon de l’admin
    const { data: salon, error: salonError } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (salonError || !salon) {
      return NextResponse.json(
        { success: false, error: 'Salon introuvable' },
        { status: 403 }
      )
    }

    // 3️⃣ Body
    const body = await req.json()
    const { image_url, alt_text, position } = body

    if (!image_url) {
      return NextResponse.json(
        { success: false, error: 'image_url requis' },
        { status: 400 }
      )
    }

    // 4️⃣ Limite 6 images
    const { count } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salon.id)
      .eq('type', IMAGE_TYPE)
      .is('deleted_at', null)

    if ((count ?? 0) >= 6) {
      return NextResponse.json(
        { success: false, error: 'Maximum 6 images atteint' },
        { status: 400 }
      )
    }

    // 5️⃣ Insert galerie
    const { data, error } = await supabase
      .from('images')
      .insert({
        salon_id: salon.id,
        type: IMAGE_TYPE,
        image_url,
        alt_text: alt_text ?? null,
        position: position ?? 0,
        is_visible: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur création image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Image ajoutée à la galerie',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

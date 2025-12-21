export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../../lib/auth/verifyAdmin'

const GALLERY_TYPE = 'gallery'
const MAX_GALLERY_IMAGES = 6

/**
 * GET — Récupère toutes les images de la galerie (ADMIN)
 */
export async function GET() {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    

    const { data, error } = await supabaseAdmin
      .from('images')
      .select(
        `
          id,
          salon_id,
          service_id,
          type,
          image_url,
          alt_text,
          position,
          is_visible,
          created_at,
          deleted_at,
          services (
            id,
            name
          )
        `
      )
      .eq('salon_id', salonId)
      .eq('type', GALLERY_TYPE)
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .limit(MAX_GALLERY_IMAGES)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des images' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST — Ajoute une image à la galerie (ADMIN)
 */
export async function POST(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    

    const body = await request.json()
    const imageUrl = body?.imageUrl as string | undefined
    const altText = body?.altText as string | undefined
    const position = body?.position as number | undefined
    const serviceId = body?.serviceId as string | null | undefined

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "URL de l'image manquante" },
        { status: 400 }
      )
    }

    // Vérifier qu'on ne dépasse pas MAX_GALLERY_IMAGES
    const { count, error: countError } = await supabaseAdmin
      .from('images')
      .select('id', { count: 'exact', head: true })
      .eq('salon_id', salonId)
      .eq('type', GALLERY_TYPE)
      .is('deleted_at', null)

    if (countError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la vérification du quota' },
        { status: 500 }
      )
    }

    if ((count ?? 0) >= MAX_GALLERY_IMAGES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_GALLERY_IMAGES} images atteint` },
        { status: 400 }
      )
    }

    // Insert
    const { data, error } = await supabaseAdmin
      .from('images')
      .insert({
        salon_id: salonId,
        type: GALLERY_TYPE,
        image_url: imageUrl,
        alt_text: altText || null,
        service_id: serviceId ?? null,
        position: typeof position === 'number' ? position : 0,
        is_visible: true,
      })
      .select(
        `
          id,
          salon_id,
          service_id,
          type,
          image_url,
          alt_text,
          position,
          is_visible,
          created_at,
          services (
            id,
            name
          )
        `
      )
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'ajout de l'image" },
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
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — Met à jour une image de la galerie (ADMIN)
 * Champs possibles: serviceId, imageUrl, altText, position, isVisible
 */
export async function PATCH(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    

    const body = await request.json()
    const id = body?.id as string | undefined

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID manquant' },
        { status: 400 }
      )
    }

    // Sécurité : vérifier que l'image appartient bien à CE salon + est de type gallery
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('images')
      .select('id')
      .eq('id', id)
      .eq('salon_id', salonId)
      .eq('type', GALLERY_TYPE)
      .is('deleted_at', null)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Image introuvable' },
        { status: 404 }
      )
    }

    const updateData: Record<string, any> = {}

    if (body.serviceId !== undefined) updateData.service_id = body.serviceId || null
    if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl
    if (body.altText !== undefined) updateData.alt_text = body.altText || null
    if (body.position !== undefined) updateData.position = Number(body.position) || 0
    if (body.isVisible !== undefined) updateData.is_visible = Boolean(body.isVisible)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('images')
      .update(updateData)
      .eq('id', id)
      .select(
        `
          id,
          salon_id,
          service_id,
          type,
          image_url,
          alt_text,
          position,
          is_visible,
          created_at,
          services (
            id,
            name
          )
        `
      )
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Image de galerie mise à jour',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * DELETE — Supprime une image de la galerie (soft delete) (ADMIN)
 */
export async function DELETE(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID manquant' },
        { status: 400 }
      )
    }

    // Sécurité : ne delete que si appartient à salon + type=gallery
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('images')
      .select('id')
      .eq('id', id)
      .eq('salon_id', salonId)
      .eq('type', GALLERY_TYPE)
      .is('deleted_at', null)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Image introuvable' },
        { status: 404 }
      )
    }

    const { error } = await supabaseAdmin
      .from('images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Image supprimée de la galerie',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

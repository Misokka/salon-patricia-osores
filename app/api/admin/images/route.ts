import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../lib/salonContext'

const IMAGE_TYPE = 'service_featured'
const BUCKET = 'salon-images'

/* ======================================================
   POST — Upload image FEATURED (1 seule image active)
====================================================== */
export async function POST(request: Request) {
  const { error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const salonId = getDefaultSalonId()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const serviceId = formData.get('service_id') as string | null

    if (!file || !serviceId) {
      return NextResponse.json(
        { success: false, error: 'Fichier ou service manquant' },
        { status: 400 }
      )
    }

    /* -----------------------------
       Validation fichier
    ----------------------------- */
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Formats acceptés : JPEG, PNG, WEBP' },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Fichier trop volumineux (5MB max)' },
        { status: 400 }
      )
    }

    /* -----------------------------
       Soft-delete ancienne image
       (RÈGLE MÉTIER CLÉ)
    ----------------------------- */
    await supabase
      .from('images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('salon_id', salonId)
      .eq('service_id', serviceId)
      .eq('type', IMAGE_TYPE)
      .is('deleted_at', null)

    /* -----------------------------
       Upload Storage
    ----------------------------- */
    const ext = file.name.split('.').pop()
    const fileName = `${serviceId}-${Date.now()}.${ext}`
    const storagePath = `services/${fileName}`

    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: 'Erreur upload fichier' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    if (!publicUrlData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: 'URL publique introuvable' },
        { status: 500 }
      )
    }

    /* -----------------------------
       Insert DB (image active unique)
    ----------------------------- */
    const { data: image, error: insertError } = await supabase
      .from('images')
      .insert({
        salon_id: salonId,
        service_id: serviceId,
        type: IMAGE_TYPE,
        image_url: publicUrlData.publicUrl,
        alt_text: 'Image du service',
        is_visible: true,
        position: 0,
      })
      .select()
      .single()

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath])

      return NextResponse.json(
        { success: false, error: 'Erreur création image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Image du service ajoutée',
      data: image,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/* ======================================================
   DELETE — Supprimer image FEATURED
====================================================== */
export async function DELETE(request: Request) {
  const { error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const salonId = getDefaultSalonId()

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { success: false, error: 'ID image manquant' },
        { status: 400 }
      )
    }

    /* -----------------------------
       Fetch image sécurisée
    ----------------------------- */
    const { data: image, error } = await supabase
      .from('images')
      .select('image_url')
      .eq('id', imageId)
      .eq('salon_id', salonId)
      .eq('type', IMAGE_TYPE)
      .is('deleted_at', null)
      .single()

    if (error || !image) {
      return NextResponse.json(
        { success: false, error: 'Image introuvable' },
        { status: 404 }
      )
    }

    /* -----------------------------
       Soft delete DB
    ----------------------------- */
    await supabase
      .from('images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', imageId)

    /* -----------------------------
       Delete Storage (best effort)
    ----------------------------- */
    try {
      const url = new URL(image.image_url)
      const path = url.pathname.split(`/${BUCKET}/`)[1]
      if (path) {
        await supabase.storage.from(BUCKET).remove([path])
      }
    } catch {
      console.warn('Suppression storage partielle')
    }

    return NextResponse.json({
      success: true,
      message: 'Image supprimée',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

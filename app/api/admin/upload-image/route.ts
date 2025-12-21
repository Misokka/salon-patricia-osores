export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'

/**
 * POST - Upload une image vers Supabase Storage
 * 
 * Body (FormData):
 * - file: File (image)
 * - folder: 'featured-services' | 'gallery' | 'about'
 * - serviceId?: string (optionnel, pour update services.image_url)
 * 
 * Returns:
 * - publicUrl: URL publique de l'image
 * - path: chemin dans le bucket
 */
export async function POST(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string
    const serviceId = formData.get('serviceId') as string | null

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Fichier manquant' },
        { status: 400 }
      )
    }

    if (!folder || !['featured-services', 'gallery', 'about'].includes(folder)) {
      return NextResponse.json(
        { success: false, error: 'Dossier invalide' },
        { status: 400 }
      )
    }

    // Validation du type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Type de fichier non autorisé. Formats acceptés: JPG, PNG, WEBP' },
        { status: 400 }
      )
    }

    // Validation de la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Fichier trop volumineux (max 5MB)' },
        { status: 400 }
      )
    }

    // Créer un nom de fichier unique
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomStr}.${extension}`
    const filePath = `${folder}/${fileName}`

    // Upload vers Supabase Storage avec auth admin
    const supabase = supabaseAdmin
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('salon-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de l\'upload de l\'image' },
        { status: 500 }
      )
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase
      .storage
      .from('salon-images')
      .getPublicUrl(filePath)

    // Si c'est pour un service, mettre à jour la table services
    if (serviceId && folder === 'featured-services') {
      const { error: updateError } = await supabase
        .from('services')
        .update({ image_url: publicUrl })
        .eq('id', serviceId)

      if (updateError) {
        // On ne rollback pas l'upload, juste un warning
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Image uploadée avec succès',
      data: {
        publicUrl,
        path: filePath
      }
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../lib/salonContext'

/**
 * GET - Récupère tous les services actifs
 */
export async function GET() {
  try {
    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        service_categories (
          id,
          name,
          color
        )
      `)
      .eq('salon_id', salonId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des services' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST - Crée un nouveau service
 */
export async function POST(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()

console.log('📥 BODY REÇU:', body)
    const {
      name,
      description,
      category_id,
      categoryId,
      duration_minutes,
      durationMinutes,
      price_type,
      priceType,
      price_value,
      priceValue,
      is_visible,
      isVisible,
      is_featured,
      isFeatured,
    } = body

    const finalCategoryId = category_id || categoryId
    const finalDurationMinutes = duration_minutes || durationMinutes
    const finalPriceType = price_type || priceType
    const finalPriceValue = price_value || priceValue
    const finalIsVisible = is_visible ?? isVisible ?? true
    const finalIsFeatured = is_featured ?? isFeatured ?? false

    if (!name || !finalCategoryId || !finalDurationMinutes || !finalPriceType) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()
    const { data, error } = await supabase
      .from('services')
      .insert({
        salon_id: salonId,
        name,
        description: description || null,
        category_id: finalCategoryId,
        duration_minutes: finalDurationMinutes,
        price_type: finalPriceType,
        price_value: finalPriceValue || null,
        is_visible: finalIsVisible,
        is_featured: finalIsFeatured,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du service' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Service créé avec succès',
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
 * PATCH - Met à jour un service
 */
export async function PATCH(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const {
      id,
      name,
      description,
      category_id,
      categoryId,
      duration_minutes,
      durationMinutes,
      price_type,
      priceType,
      price_value,
      priceValue,
      is_visible,
      isVisible,
      is_featured,
      isFeatured,
      position,
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'L\'ID est obligatoire' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category_id !== undefined || categoryId !== undefined) {
      updateData.category_id = category_id || categoryId
    }
    if (duration_minutes !== undefined || durationMinutes !== undefined) {
      updateData.duration_minutes = duration_minutes || durationMinutes
    }
    if (price_type !== undefined || priceType !== undefined) {
      updateData.price_type = price_type || priceType
    }
    if (price_value !== undefined || priceValue !== undefined) {
      updateData.price_value = price_value !== undefined ? price_value : priceValue
    }
    if (is_visible !== undefined || isVisible !== undefined) {
      updateData.is_visible = is_visible !== undefined ? is_visible : isVisible
    }
    if (is_featured !== undefined || isFeatured !== undefined) {
      updateData.is_featured = is_featured !== undefined ? is_featured : isFeatured
    }
    if (position !== undefined) updateData.position = position

    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()
    
    // Vérifier que le service existe et appartient au salon
    const { data: existing } = await supabase
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Service introuvable' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .eq('salon_id', salonId)
      .select()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune modification effectuée' },
        { status: 400 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune modification effectuée' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Service mis à jour',
      data: data[0],
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Supprime un service (soft delete)
 */
export async function DELETE(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'L\'ID est obligatoire' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()

    // Soft delete
    const { error } = await supabase
      .from('services')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('salon_id', salonId)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Service supprimé',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

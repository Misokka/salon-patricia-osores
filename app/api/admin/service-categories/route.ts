export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../lib/salonContext'

/**
 * GET - Récupère toutes les catégories actives
 */
export async function GET() {
  try {
    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('salon_id', salonId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des catégories' },
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
 * POST - Crée une nouvelle catégorie
 */
export async function POST(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()
    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Le nom est obligatoire' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('service_categories')
      .insert({ salon_id: salonId, name, color: color || null })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de la catégorie' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Catégorie créée avec succès',
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
 * PATCH - Met à jour une catégorie
 */
export async function PATCH(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = supabaseAdmin
    const body = await request.json()
    const { id, name, color, position } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'L\'ID est obligatoire' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (color !== undefined) updateData.color = color
    if (position !== undefined) updateData.position = position

    const { data, error } = await supabase
      .from('service_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Catégorie mise à jour',
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
 * DELETE - Supprime une catégorie (soft delete)
 */
export async function DELETE(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = supabaseAdmin
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'L\'ID est obligatoire' },
        { status: 400 }
      )
    }

    // Soft delete
    const { error } = await supabase
      .from('service_categories')
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
      message: 'Catégorie supprimée',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

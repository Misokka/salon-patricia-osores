export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'

/**
 * GET — Récupère toutes les catégories actives
 * (⚠️ peut retourner 0 ligne → PAS de .single())
 */
export async function GET() {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {

    const { data, error } = await supabaseAdmin
      .from('service_categories')
      .select('*')
      .eq('salon_id', salonId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data ?? [],
    })
  } catch (error) {
    console.error('[API /api/admin/service-categories GET]', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST — Crée une nouvelle catégorie
 * (⚠️ INSERT → PAS de .single())
 */
export async function POST(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, color } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Le nom est obligatoire' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('service_categories')
      .insert({
        salon_id: salonId,
        name,
        color: color ?? null,
      })
      .select()
      .limit(1)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: data?.[0] ?? null,
    })
  } catch (error) {
    console.error('[API /api/admin/service-categories POST]', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — Met à jour une catégorie existante
 * (⚠️ UPDATE → PAS de .single())
 */
export async function PATCH(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, name, color, position } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID obligatoire' },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (color !== undefined) updateData.color = color
    if (position !== undefined) updateData.position = position

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('service_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .limit(1)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Catégorie mise à jour',
      data: data?.[0] ?? null,
    })
  } catch (error) {
    console.error('[API /api/admin/service-categories PATCH]', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * DELETE — Soft delete d’une catégorie
 */
export async function DELETE(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID obligatoire' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('service_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Catégorie supprimée',
    })
  } catch (error) {
    console.error('[API /api/admin/service-categories DELETE]', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

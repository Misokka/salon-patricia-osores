export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'

/**
 * PATCH - Met à jour un membre de l'équipe (nom, is_active)
 */
export async function PATCH(
  request: Request,
  context: any
) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = await request.json()
    const { name, is_active } = body

    // Vérifier que le membre appartient au salon
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('staff_members')
      .select('id, salon_id')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Membre introuvable' },
        { status: 404 }
      )
    }

    // Construire l'objet de mise à jour
    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .update(updateData)
      .eq('id', id)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) {
      // Gérer l'erreur du trigger "au moins 1 actif"
      if (error.message?.includes('au moins 1 membre actif')) {
        return NextResponse.json(
          { success: false, error: 'Impossible de désactiver le dernier membre actif' },
          { status: 400 }
        )
      }
      console.error('[PATCH /api/admin/staff-members/[id]] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('[PATCH /api/admin/staff-members/[id]] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Supprime un membre de l'équipe
 */
export async function DELETE(
  request: Request,
  context: any
) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { id } = await context.params

    // Vérifier que le membre appartient au salon
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('staff_members')
      .select('id, salon_id')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Membre introuvable' },
        { status: 404 }
      )
    }

    const { error } = await supabaseAdmin
      .from('staff_members')
      .delete()
      .eq('id', id)
      .eq('salon_id', salonId)

    if (error) {
      // Gérer l'erreur du trigger "au moins 1 actif"
      if (error.message?.includes('au moins 1 membre actif')) {
        return NextResponse.json(
          { success: false, error: 'Impossible de supprimer le dernier membre actif' },
          { status: 400 }
        )
      }
      console.error('[DELETE /api/admin/staff-members/[id]] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/staff-members/[id]] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

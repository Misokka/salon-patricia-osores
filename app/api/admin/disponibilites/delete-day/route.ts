import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '../../../../../lib/auth/verifyAdmin'

/**
 * DELETE - Supprime tous les créneaux d'une date spécifique
 */
export async function DELETE(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date requise' },
        { status: 400 }
      )
    }

    // 1. Récupérer tous les créneaux de cette date avec leur statut
    const { data: allSlots, error: fetchError } = await supabase
      .from('time_slots')
      .select('id, slot_date, start_time, is_available')
      .eq('slot_date', date)

    if (fetchError) throw fetchError

    if (!allSlots || allSlots.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun créneau à supprimer',
        count: 0,
      })
    }

    // 2. Filtrer uniquement les créneaux DISPONIBLES (is_available = true)
    const slotsToDelete = allSlots.filter(slot => slot.is_available === true)
    const reservedSlots = allSlots.filter(slot => slot.is_available === false)

    if (slotsToDelete.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Tous les créneaux sont réservés. Impossible de supprimer.`,
        count: 0,
      })
    }

    // 3. Supprimer uniquement les créneaux disponibles
    const slotIds = slotsToDelete.map(s => s.id)
    const { error: deleteError } = await supabase
      .from('time_slots')
      .delete()
      .in('id', slotIds)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: `${slotsToDelete.length} créneau(x) supprimé(s). ${reservedSlots.length} créneau(x) conservé(s) (réservés).`,
      count: slotsToDelete.length,
      keptSlots: reservedSlots, // Retourner les créneaux conservés pour update frontend
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

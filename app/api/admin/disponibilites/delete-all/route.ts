import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE - Supprime TOUS les créneaux non réservés
 * Vérifie qu'aucun créneau n'est lié à un rendez-vous confirmé
 */
export async function DELETE(request: Request) {
  try {
    // Vérification admin
    const { user, error } = await verifyAdminAuth()
    if (error) return error


    const supabase = await createClient()

    // 1. Récupérer tous les créneaux disponibles
    const { data: allSlots, error: fetchError } = await supabase
      .from('time_slots')
      .select('id, slot_date, start_time')
      .eq('is_available', true)

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des créneaux' },
        { status: 500 }
      )
    }

    if (!allSlots || allSlots.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun créneau à supprimer',
        count: 0,
      })
    }

    // 2. Récupérer tous les rendez-vous confirmés ou en attente
    const { data: bookedSlots, error: rdvError } = await supabase
      .from('appointments')
      .select('appointment_date, start_time')
      .in('status', ['accepted', 'pending'])

    if (rdvError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la vérification des rendez-vous' },
        { status: 500 }
      )
    }

    // 3. Créer un Set des créneaux bookés pour recherche rapide
    const bookedSet = new Set(
      (bookedSlots || []).map((rdv) => `${rdv.appointment_date}|${rdv.start_time}`)
    )

    // 4. Filtrer les créneaux non bookés
    const slotsToDelete = allSlots.filter(
      (slot) => !bookedSet.has(`${slot.slot_date}|${slot.start_time}`)
    )

    // 5. Si tous les créneaux sont bookés
    if (slotsToDelete.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tous les créneaux sont liés à des rendez-vous. Aucune suppression effectuée.',
        bookedCount: allSlots.length,
      })
    }

    // 6. Supprimer uniquement les créneaux non bookés
    const slotIds = slotsToDelete.map((s) => s.id)
    
    const { error: deleteError } = await supabase
      .from('time_slots')
      .delete()
      .in('id', slotIds)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${slotsToDelete.length} créneau${slotsToDelete.length > 1 ? 'x' : ''} supprimé${slotsToDelete.length > 1 ? 's' : ''}. ${bookedSet.size} créneau${bookedSet.size > 1 ? 'x' : ''} conservé${bookedSet.size > 1 ? 's' : ''} (rendez-vous existants).`,
      deletedCount: slotsToDelete.length,
      keptCount: bookedSet.size,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

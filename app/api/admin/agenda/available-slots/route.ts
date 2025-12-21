import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET - Récupère les créneaux disponibles pour une date donnée
 * Exclut les créneaux déjà bookés
 */
export async function GET(request: Request) {
  try {
    // Vérification admin
    const authResult = await verifyAdminAuth()
    if (authResult.error) {
      return authResult.error
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date manquante' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin

    // 1. Récupérer les disponibilités créées pour cette date
    const { data: dispos, error: dispoError } = await supabase
      .from('time_slots')
      .select('start_time, is_available')
      .eq('slot_date', date)
      .eq('is_available', true)

    if (dispoError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des disponibilités' },
        { status: 500 }
      )
    }

    if (!dispos || dispos.length === 0) {
      return NextResponse.json({
        success: true,
        date,
        slots: [],
        message: 'Aucun créneau disponible pour cette date',
      })
    }

    // 2. Récupérer tous les RDV confirmés ou en attente pour cette date
    const { data: bookedRdv, error: rdvError } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('appointment_date', date)
      .in('status', ['accepted', 'pending'])

    if (rdvError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des rendez-vous' },
        { status: 500 }
      )
    }

    // Créer un Set des heures bookées
    const bookedTimes = new Set((bookedRdv || []).map(rdv => rdv.start_time))

    // Filtrer les créneaux disponibles (dans time_slots ET non bookés)
    const availableSlots = dispos
      .filter(dispo => !bookedTimes.has(dispo.start_time))
      .map(dispo => dispo.start_time)
      .sort()

    return NextResponse.json({
      success: true,
      date,
      slots: availableSlots,
      bookedCount: bookedTimes.size,
      availableCount: availableSlots.length,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

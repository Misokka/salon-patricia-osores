export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase/admin'
import { verifyAdminAuth } from '../../../../../lib/auth/verifyAdmin'
import { format } from 'date-fns'

/**
 * GET — Check time slots that will be affected by deleting a time range
 */
export async function GET(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const rangeId = searchParams.get('rangeId')

    if (!rangeId) {
      return NextResponse.json(
        { success: false, error: 'Missing rangeId' },
        { status: 400 }
      )
    }

    // Récupérer les infos de la plage horaire
    const { data: timeRange, error: rangeError } = await supabaseAdmin
      .from('opening_time_ranges')
      .select('*')
      .eq('id', rangeId)
      .eq('salon_id', salonId)
      .single()

    if (rangeError || !timeRange) {
      return NextResponse.json(
        { success: false, error: 'Time range not found' },
        { status: 404 }
      )
    }

    // Trouver tous les créneaux futurs pour ce jour et cette plage horaire
    const today = format(new Date(), 'yyyy-MM-dd')
    
    // Calculer le jour de la semaine pour la requête (0=lundi, 6=dimanche en DB)
    const dayOfWeek = timeRange.day_of_week

    // Récupérer tous les créneaux futurs pour ce jour de la semaine
    const { data: allSlots, error: slotsError } = await supabaseAdmin
      .from('time_slots')
      .select('id, slot_date, start_time, is_available')
      .eq('salon_id', salonId)
      .gte('slot_date', today)
      .order('slot_date', { ascending: true })

    if (slotsError) throw slotsError

    // Filtrer pour ne garder que les créneaux du bon jour de la semaine et de la bonne plage horaire
    const affectedSlots = (allSlots || []).filter(slot => {
      const slotDate = new Date(slot.slot_date)
      const slotDayOfWeek = (slotDate.getDay() + 6) % 7 // Convertir dimanche=0 en dimanche=6
      
      if (slotDayOfWeek !== dayOfWeek) return false
      
      // Vérifier si le créneau est dans la plage horaire
      const slotTime = slot.start_time
      return slotTime >= timeRange.start_time && slotTime < timeRange.end_time
    })

    // Compter les créneaux disponibles et réservés
    const availableSlots = affectedSlots.filter(s => s.is_available)
    const bookedSlots = affectedSlots.filter(s => !s.is_available)

    // Trouver la première et dernière date concernée
    let firstDate = null
    let lastDate = null
    if (affectedSlots.length > 0) {
      firstDate = affectedSlots[0].slot_date
      lastDate = affectedSlots[affectedSlots.length - 1].slot_date
    }

    return NextResponse.json({
      success: true,
      data: {
        totalSlots: affectedSlots.length,
        availableSlots: availableSlots.length,
        bookedSlots: bookedSlots.length,
        firstDate,
        lastDate,
        dayOfWeek: timeRange.day_of_week,
        startTime: timeRange.start_time,
        endTime: timeRange.end_time,
      },
    })
  } catch (error) {
    console.error('[API /api/admin/horaires/check-slots GET]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

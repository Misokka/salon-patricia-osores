export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addMinutes, parse, format } from 'date-fns'
import { PUBLIC_SALON_ID } from '@/lib/salonContext'

// Initialiser le client Supabase
function getSupabase() {
  return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
}

/**
 * GET - Récupère les horaires réellement disponibles pour un service donné
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('service_id')
    const date = searchParams.get('date')
    const dateDebut = searchParams.get('date_debut')
    const dateFin = searchParams.get('date_fin')

    if (!serviceId) {
      return NextResponse.json(
        { success: false, error: 'service_id est obligatoire' },
        { status: 400 }
      )
    }

    // Récupérer le service
    const { data: service, error: serviceError } = await getSupabase()
      .from('services')
      .select('id, name, duration_minutes')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: 'Service introuvable' },
        { status: 404 }
      )
    }

    const salonId = PUBLIC_SALON_ID

    // Récupérer la fréquence des créneaux
    const { data: settings } = await getSupabase()
      .from('salon_settings')
      .select('default_slot_frequency_minutes')
      .eq('salon_id', salonId)
      .single()

    const slotFrequencyMinutes = settings?.default_slot_frequency_minutes || 30
    const requiredSlots = Math.ceil(
      service.duration_minutes / slotFrequencyMinutes
    )

    // Construire la requête
    let query = getSupabase()
      .from('time_slots')
      .select('id, slot_date, start_time, is_available')
      .eq('is_available', true)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (date) {
      query = query.eq('slot_date', date)
    } else if (dateDebut && dateFin) {
      query = query.gte('slot_date', dateDebut).lte('slot_date', dateFin)
    } else {
      return NextResponse.json(
        { success: false, error: 'date ou (date_debut + date_fin) requis' },
        { status: 400 }
      )
    }

    const { data: allSlots, error: slotsError } = await query

    if (slotsError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des créneaux' },
        { status: 500 }
      )
    }

    // Jours fermés
    const { data: closedDays } = await getSupabase()
      .from('opening_days')
      .select('day_of_week')
      .eq('salon_id', salonId)
      .eq('is_open', false)

    const closedDaysSet = new Set(
      (closedDays || []).map((d) => d.day_of_week)
    )

    // Fermetures exceptionnelles
    const { data: exceptionalClosed } = await getSupabase()
      .from('salon_exceptional_hours')
      .select('start_date, end_date')
      .eq('salon_id', salonId)
      .eq('type', 'closed')

    const { data: exceptionalOpen } = await getSupabase()
      .from('salon_exceptional_hours')
      .select('start_date, end_date')
      .eq('salon_id', salonId)
      .eq('type', 'open')

    // Filtrer les créneaux valides
    const now = new Date()

    const validSlots = (allSlots || []).filter((slot) => {
      const slotDateTime = new Date(
        `${slot.slot_date}T${slot.start_time}`
      )
      if (slotDateTime <= now) return false

      const isExceptionallyOpen = (exceptionalOpen || []).some(
        (exc) =>
          slot.slot_date >= exc.start_date &&
          slot.slot_date <= exc.end_date
      )

      if (!isExceptionallyOpen) {
        const dayOfWeek =
          (new Date(slot.slot_date).getDay() + 6) % 7
        if (closedDaysSet.has(dayOfWeek)) return false
      }

      const isExceptionallyClosed = (exceptionalClosed || []).some(
        (exc) =>
          slot.slot_date >= exc.start_date &&
          slot.slot_date <= exc.end_date
      )

      return !isExceptionallyClosed
    })

    // Grouper par date
    const slotsByDate = validSlots.reduce<Record<string, any[]>>(
      (acc, slot) => {
        if (!acc[slot.slot_date]) {
          acc[slot.slot_date] = []
        }
        acc[slot.slot_date].push(slot)
        return acc
      },
      {}
    )

    // Calculer les horaires réservables
    const availableSlots: any[] = []

    for (const [dateKey, slots] of Object.entries(slotsByDate)) {
      slots.sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      )

      for (let i = 0; i < slots.length; i++) {
        const startSlot = slots[i]
        const startTime = parse(
          startSlot.start_time,
          'HH:mm:ss',
          new Date()
        )

        let isBookable = true
        const requiredSlotsList = [startSlot]

        for (let j = 1; j < requiredSlots; j++) {
          const expectedTime = addMinutes(
            startTime,
            j * slotFrequencyMinutes
          )
          const expectedHeure = format(
            expectedTime,
            'HH:mm:ss'
          )

          const nextSlot = slots.find(
            (s) => s.start_time === expectedHeure
          )

          if (!nextSlot || !nextSlot.is_available) {
            isBookable = false
            break
          }

          requiredSlotsList.push(nextSlot)
        }

        if (isBookable) {
          availableSlots.push({
            date: dateKey,
            heure: startSlot.start_time,
            required_slots: requiredSlotsList.map((s) => ({
              id: s.id,
              heure: s.start_time,
            })),
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        service,
        slot_frequency_minutes: slotFrequencyMinutes,
        required_slots_count: requiredSlots,
        available_slots: availableSlots,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../lib/salonContext'
import { addDays, addMinutes, format, parse, parseISO } from 'date-fns'

/**
 * GET – Récupère tous les horaires exceptionnels
 */
export async function GET() {
  try {
    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()

    const { data, error } = await supabase
      .from('exceptional_periods')
      .select(`*, exceptional_time_ranges (*)`)
      .eq('salon_id', salonId)
      .order('start_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST – Crée un horaire exceptionnel
 */
export async function POST(request: Request) {
  const { error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()
    const body = await request.json()

    const {
      start_date,
      end_date,
      type,
      reason,
      time_ranges,
      confirm_cancel_appointments,
    } = body

    if (!start_date || !end_date || !type) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    if (type === 'closed' && !confirm_cancel_appointments) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          customer_name,
          customer_email,
          appointment_date,
          start_time,
          services!inner(name)
        `)
        .eq('salon_id', salonId)
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date)
        .eq('status', 'accepted')

      if (appointments?.length) {
        return NextResponse.json(
          {
            success: false,
            requiresConfirmation: true,
            appointments: appointments.map((a: any) => ({
              id: a.id,
              nom: a.customer_name,
              email: a.customer_email,
              service: a.services?.name ?? 'Service',
              date: a.appointment_date,
              heure: a.start_time,
            })),
          },
          { status: 409 }
        )
      }
    }

    const { data: exceptional, error } = await supabase
      .from('exceptional_periods')
      .insert({
        salon_id: salonId,
        start_date,
        end_date,
        type,
        reason,
      })
      .select()
      .single()

    if (error) throw error

    if (type === 'closed' && confirm_cancel_appointments) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`id`)
        .eq('salon_id', salonId)
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date)
        .eq('status', 'accepted')

      if (appointments?.length) {
        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .in('id', appointments.map(a => a.id))
      }

      const { data: slots } = await supabase
        .from('time_slots')
        .select('id')
        .eq('salon_id', salonId)
        .gte('slot_date', start_date)
        .lte('slot_date', end_date)
        .eq('is_available', true)

      if (slots?.length) {
        await supabase
          .from('time_slots')
          .delete()
          .in('id', slots.map(s => s.id))
      }
    }

    if (type === 'open' && Array.isArray(time_ranges)) {
      const ranges = time_ranges.map((r: any) => ({
        exceptional_period_id: exceptional.id,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        slot_frequency_minutes: r.slot_frequency_minutes,
      }))

      await supabase.from('exceptional_time_ranges').insert(ranges)

      let totalSlots = 0
      for (const range of time_ranges) {
        totalSlots += await generateExceptionalSlots(
          supabase,
          salonId,
          start_date,
          end_date,
          range.start_time,
          range.end_time,
          range.slot_frequency_minutes
        )
      }

      return NextResponse.json({
        success: true,
        message:
          totalSlots > 0
            ? `Horaire exceptionnel créé avec ${totalSlots} créneau(x)`
            : 'Ouverture créée mais aucun créneau généré',
        data: exceptional,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Horaire exceptionnel créé',
      data: exceptional,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * DELETE – Supprime un horaire exceptionnel
 */
export async function DELETE(request: Request) {
  const { error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID requis' },
        { status: 400 }
      )
    }

    const { data: exceptional, error } = await supabase
      .from('exceptional_periods')
      .select('*')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (error) throw error

    await supabase.from('exceptional_periods').delete().eq('id', id)

    return NextResponse.json({
      success: true,
      message: 'Horaire exceptionnel supprimé',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * Génère les créneaux pour une ouverture exceptionnelle
 */
async function generateExceptionalSlots(
  supabase: any,
  salonId: string,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  frequency: number
): Promise<number> {
  const slots: any[] = []
  const start = parseISO(startDate)
  const end = parseISO(endDate)

  let date = start
  while (date <= end) {
    const dateStr = format(date, 'yyyy-MM-dd')
    let time = parse(startTime, 'HH:mm:ss', date)
    const endParsed = parse(endTime, 'HH:mm:ss', date)

    while (time < endParsed) {
      slots.push({
        salon_id: salonId,
        slot_date: dateStr,
        start_time: format(time, 'HH:mm:ss'),
        is_available: true,
      })
      time = addMinutes(time, frequency)
    }

    date = addDays(date, 1)
  }

  if (!slots.length) return 0

  const { error } = await supabase.from('time_slots').insert(slots)
  if (error) return 0

  return slots.length
}

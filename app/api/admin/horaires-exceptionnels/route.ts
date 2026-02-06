export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { addDays, addMinutes, format, parse, parseISO } from 'date-fns'
import { sendExceptionalClosureEmail, sendRejectionEmail, getSiteUrl } from '../../../../lib/emailService'

/**
 * GET – Récupère tous les horaires exceptionnels
 */
export async function GET() {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { data, error } = await supabaseAdmin
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
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
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
      const { data: appointments } = await supabaseAdmin
        .from('appointments')
        .select(`
          id,
          customer_name,
          customer_email,
          appointment_date,
          start_time,
          status,
          services!inner(name)
        `)
        .eq('salon_id', salonId)
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date)
        .in('status', ['pending', 'accepted'])

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
              status: a.status,
            })),
          },
          { status: 409 }
        )
      }
    }

    const { data: exceptional, error } = await supabaseAdmin
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
      // Récupérer tous les rendez-vous (pending et accepted) avec leurs détails pour les emails
      const { data: appointments } = await supabaseAdmin
        .from('appointments')
        .select(`
          id,
          status,
          customer_name,
          customer_email,
          appointment_date,
          start_time,
          services!inner(name)
        `)
        .eq('salon_id', salonId)
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date)
        .in('status', ['pending', 'accepted'])

      if (appointments?.length) {
        const appointmentIds = appointments.map(a => a.id)
        const pendingAppointments = appointments.filter(a => a.status === 'pending')
        const acceptedAppointments = appointments.filter(a => a.status === 'accepted')
        
        // Libérer les créneaux associés aux rendez-vous annulés
        const { data: slotsToFree } = await supabaseAdmin
          .from('appointment_slots')
          .select('time_slot_id')
          .in('appointment_id', appointmentIds)

        if (slotsToFree && slotsToFree.length > 0) {
          const slotIds = slotsToFree.map(s => s.time_slot_id)
          await supabaseAdmin
            .from('time_slots')
            .update({ is_available: true })
            .in('id', slotIds)
        }

        // Refuser les rendez-vous en attente
        if (pendingAppointments.length > 0) {
          const pendingIds = pendingAppointments.map(a => a.id)
          await supabaseAdmin
            .from('appointments')
            .update({ status: 'refused' })
            .in('id', pendingIds)

          // Envoyer emails de refus
          for (const apt of pendingAppointments) {
            if (apt.customer_email) {
              try {
                await sendRejectionEmail({
                  nom: apt.customer_name,
                  email: apt.customer_email,
                  service: (apt as any).services?.name ?? 'Service',
                  date: apt.appointment_date,
                  heure: apt.start_time,
                  managementUrl: `${getSiteUrl()}/rendezvous`,
                })
              } catch (emailError) {
                console.error(`Erreur envoi email refus pour ${apt.customer_email}:`, emailError)
              }
            }
          }
        }

        // Annuler les rendez-vous acceptés
        if (acceptedAppointments.length > 0) {
          const acceptedIds = acceptedAppointments.map(a => a.id)
          await supabaseAdmin
            .from('appointments')
            .update({ status: 'cancelled' })
            .in('id', acceptedIds)

          // Envoyer emails d'annulation avec raison
          const closureReason = reason || 'Fermeture exceptionnelle du salon'
          for (const apt of acceptedAppointments) {
            if (apt.customer_email) {
              try {
                await sendExceptionalClosureEmail({
                  nom: apt.customer_name,
                  email: apt.customer_email,
                  service: (apt as any).services?.name ?? 'Service',
                  date: apt.appointment_date,
                  heure: apt.start_time,
                  reason: closureReason,
                })
              } catch (emailError) {
                console.error(`Erreur envoi email annulation pour ${apt.customer_email}:`, emailError)
              }
            }
          }
        }
      }

      const { data: slots } = await supabaseAdmin
        .from('time_slots')
        .select('id')
        .eq('salon_id', salonId)
        .gte('slot_date', start_date)
        .lte('slot_date', end_date)
        .eq('is_available', true)

      if (slots?.length) {
        await supabaseAdmin
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

      await supabaseAdmin.from('exceptional_time_ranges').insert(ranges)

      let totalSlots = 0
      for (const range of time_ranges) {
        totalSlots += await generateExceptionalSlots(
          supabaseAdmin,
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
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID requis' },
        { status: 400 }
      )
    }

    const { data: exceptional, error } = await supabaseAdmin
      .from('exceptional_periods')
      .select('*')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (error) throw error

    await supabaseAdmin.from('exceptional_periods').delete().eq('id', id)

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

  const { error } = await supabaseAdmin.from('time_slots').insert(slots)
  if (error) return 0

  return slots.length
}

export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendAcceptanceEmail, sendRejectionEmail, sendCancellationEmail } from '../../../../lib/emailService'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
// 🔒 Fonctionnalité Google Agenda temporairement désactivée pour le premier déploiement
// import { createCalendarEvent } from '../../../../lib/googleCalendarService'

type AppointmentWithService = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  service_id: string
  appointment_date: string
  start_time: string
  status: string
  created_at: string
  services: {
    id: string
    name: string
    duration_minutes: number
  } | null
}


/**
 * GET - Récupère tous les rendez-vous triés par date de création
 */
export async function GET() {
  // Vérifier l'authentification admin
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        services (
          id,
          name,
          duration_minutes
        )
      `)
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })
      .returns<AppointmentWithService[]>()


    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des rendez-vous' },
        { status: 500 }
      )
    }

    // Transformer les données pour inclure service_name
    const transformedData = (data || []).map(appointment => ({
      ...appointment,
      service_name: appointment.services?.name || 'Service inconnu',
      service_duration_minutes: appointment.services?.duration_minutes ?? null,
    }))
    return NextResponse.json({
      success: true,
      data: transformedData,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Met à jour le statut d'un rendez-vous et envoie un email au client
 */
export async function PATCH(request: Request) {
  // Vérifier l'authentification admin
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
    const body = await request.json()
    const { id, statut, status } = body

    // Accepter à la fois 'statut' (français) et 'status' (anglais)
    const receivedStatus = statut || status

    // Validation
    if (!id || !receivedStatus) {
      return NextResponse.json(
        { success: false, error: 'Les champs id et statut/status sont obligatoires' },
        { status: 400 }
      )
    }

    // Mapper ancien statut → nouveau statut (accepter français et anglais)
    const statusMap: Record<string, string> = {
      'en_attente': 'pending',
      'accepte': 'accepted',
      'refuse': 'refused',
      'annule': 'cancelled',
      'pending': 'pending',
      'accepted': 'accepted',
      'refused': 'refused',
      'cancelled': 'cancelled',
    }

    const newStatus = statusMap[receivedStatus]
    if (!newStatus) {
      return NextResponse.json(
        { success: false, error: 'Statut invalide. Valeurs acceptées : pending, accepted, refused, cancelled, en_attente, accepte, refuse, annule' },
        { status: 400 }
      )
    }

    // Récupérer les informations du rendez-vous avant mise à jour
    const { data: rdvData, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !rdvData) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // Mise à jour du statut dans Supabase
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour du statut' },
        { status: 500 }
      )
    }

    // Si le rendez-vous est annulé, libérer les créneaux associés
    if (newStatus === 'cancelled') {
      const { data: slots, error: slotsError } = await supabaseAdmin
        .from('appointment_slots')
        .select('time_slot_id')
        .eq('appointment_id', id)

      if (!slotsError && slots && slots.length > 0) {
        const slotIds = slots.map(s => s.time_slot_id)
        await supabaseAdmin
          .from('time_slots')
          .update({ is_available: true })
          .in('id', slotIds)
        
      }
    }

    // Envoi d'email selon le statut
    try {
      // Récupérer le nom du service pour tous les emails
      const { data: serviceData } = await supabaseAdmin
        .from('services')
        .select('name')
        .eq('id', rdvData.service_id)
        .single()

      const serviceName = serviceData?.name || 'Service'

      if (newStatus === 'accepted' && rdvData.customer_email) {
        await sendAcceptanceEmail({
          nom: rdvData.customer_name,
          email: rdvData.customer_email,
          service: serviceName,
          date: rdvData.appointment_date,
          heure: rdvData.start_time,
        })

        // 🔒 Fonctionnalité Google Agenda temporairement désactivée pour le premier déploiement
        // Synchronisation avec Google Calendar
        // try {
        //   await createCalendarEvent({
        //     nom: rdvData.customer_name,
        //     service: rdvData.service_id,
        //     date: rdvData.appointment_date,
        //     heure: rdvData.start_time,
        //     message: rdvData.message,
        //     email: rdvData.customer_email,
        //     telephone: rdvData.customer_phone,
        //   })
        // } catch (calendarError) {
        //   // On continue même si Calendar échoue
        // }
      } else if (newStatus === 'refused' && rdvData.customer_email) {
        await sendRejectionEmail({
          nom: rdvData.customer_name,
          email: rdvData.customer_email,
        })
      } else if (newStatus === 'cancelled' && rdvData.customer_email) {
        await sendCancellationEmail({
          nom: rdvData.customer_name,
          email: rdvData.customer_email,
          service: serviceName,
          date: rdvData.appointment_date,
          heure: rdvData.start_time,
        })
      }
    } catch (emailError) {
      // On continue même si l'email échoue
      return NextResponse.json({
        success: true,
        message: 'Statut mis à jour mais l\'envoi d\'email a échoué',
        data,
      })
    }

    // Message de succès selon le statut
    let message = 'Rendez-vous mis à jour';
    if (newStatus === 'accepted') {
      message = 'Rendez-vous accepté';
    } else if (newStatus === 'refused') {
      message = 'Rendez-vous refusé';
    } else if (newStatus === 'cancelled') {
      message = 'Rendez-vous annulé';
    }

    return NextResponse.json({
      success: true,
      message,
      data,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

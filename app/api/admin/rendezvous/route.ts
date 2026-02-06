export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendAcceptanceEmail, sendRejectionEmail, sendCancellationEmail, getSiteUrl } from '../../../../lib/emailService'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import crypto from 'crypto'
// 🔒 Fonctionnalité Google Agenda temporairement désactivée pour le premier déploiement
// import { createCalendarEvent } from '../../../../lib/googleCalendarService'

type AppointmentWithService = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  service_id: string
  staff_member_id: string | null
  appointment_date: string
  start_time: string
  status: string
  created_at: string
  management_token?: string | null
  services: {
    id: string
    name: string
    duration_minutes: number
  } | null
  staff_members: {
    id: string
    name: string
    is_active: boolean
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
        ),
        staff_members:staff_member_id (
          id,
          name,
          is_active
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

    // Transformer les données pour inclure service_name et staff info
    const transformedData = (data || []).map(appointment => ({
      ...appointment,
      service_name: appointment.services?.name || 'Service inconnu',
      service_duration_minutes: appointment.services?.duration_minutes ?? null,
      staff_member_name: appointment.staff_members?.name || null,
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
    const { id, statut, status, skipEmail = false } = body

    // Accepter à la fois 'statut' (français) et 'status' (anglais)
    const receivedStatus = statut || status

    // ID actif (peut changer si on crée un nouveau RDV)
    let activeAppointmentId = id

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

    // ===================================================
    // STEP 3.4 : Gestion du refus d'une modification proposée
    // ===================================================
    if (newStatus === 'refused' && (rdvData.proposed_date || rdvData.proposed_start_time)) {
      // Le gérant refuse la modification, on vide les proposed_* et on passe en refused
      await supabaseAdmin
        .from('appointments')
        .update({
          proposed_date: null,
          proposed_start_time: null,
          status: 'refused'
        })
        .eq('id', id)

      console.log('[PATCH refuse] Modification proposée refusée, proposed_* vidés')

      return NextResponse.json({
        success: true,
        message: 'Modification refusée'
      })
    }

    // ===================================================
    // STEP 3.5 : Gestion des modifications proposées (proposed_*)
    // ===================================================
    if (newStatus === 'accepted' && (rdvData.proposed_date || rdvData.proposed_start_time)) {
      // Le client a demandé une modification, on doit déplacer le RDV
      const newDate = rdvData.proposed_date
      const newTime = rdvData.proposed_start_time
      
      console.log('[PATCH accept] Modification proposée détectée:', { oldDate: rdvData.appointment_date, oldTime: rdvData.start_time, newDate, newTime })

      // Récupérer la durée du service
      const { data: serviceData } = await supabaseAdmin
        .from('services')
        .select('duration_minutes, id')
        .eq('id', rdvData.service_id)
        .single()

      if (!serviceData) {
        return NextResponse.json(
          { success: false, error: 'Service introuvable' },
          { status: 404 }
        )
      }

      // Supprimer les anciens créneaux
      await supabaseAdmin
        .from('appointment_slots')
        .delete()
        .eq('appointment_id', id)

      // Utiliser la RPC pour réserver aux nouvelles dates
      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('book_appointment_with_staff', {
          p_salon_id: salonId,
          p_service_id: serviceData.id,
          p_customer_name: rdvData.customer_name,
          p_customer_phone: rdvData.customer_phone,
          p_customer_email: rdvData.customer_email,
          p_appointment_date: newDate,
          p_start_time: newTime,
          p_duration_minutes: serviceData.duration_minutes,
          p_message: rdvData.message,
          p_origin: 'admin',
          p_initial_status: 'accepted',
          p_staff_member_id: rdvData.staff_member_id
        })

      console.log('[PATCH accept] Résultat RPC:', { success: rpcResult?.success, appointmentId: rpcResult?.appointment_id, error: rpcError })

      if (rpcError || !rpcResult?.success) {
        console.error('[PATCH accept] Erreur RPC book_appointment:', rpcError || rpcResult)
        return NextResponse.json(
          { success: false, error: 'Le créneau demandé n\'est plus disponible' },
          { status: 409 }
        )
      }

      const newAppointmentId = rpcResult.appointment_id
      console.log('[PATCH accept] Nouveau RDV créé:', newAppointmentId)

      // Générer ou récupérer le management_token
      let managementToken = rdvData.management_token
      if (!managementToken) {
        managementToken = crypto.randomBytes(32).toString('hex')
        console.log('[PATCH accept] Génération nouveau token:', managementToken)
      }

      // Copier/définir le management_token sur le nouveau RDV
      if (newAppointmentId && newAppointmentId !== id) {
        const { error: updateTokenError } = await supabaseAdmin
          .from('appointments')
          .update({ management_token: managementToken })
          .eq('id', newAppointmentId)

        if (updateTokenError) {
          console.error('[PATCH accept] Erreur mise à jour token:', updateTokenError)
        }

        console.log('[PATCH accept] Token copié sur nouveau RDV:', newAppointmentId)

        // Vérifier que le RDV existe bien avec le token
        const { data: checkData, error: checkError } = await supabaseAdmin
          .from('appointments')
          .select('id, management_token')
          .eq('id', newAppointmentId)
          .single()

        console.log('[PATCH accept] Vérification RDV après update:', { checkData, checkError })

        // Supprimer l'ancien RDV
        await supabaseAdmin
          .from('appointments')
          .delete()
          .eq('id', id)

        console.log('[PATCH accept] Ancien RDV supprimé:', id)

        // Mettre à jour l'ID actif et le token dans rdvData
        activeAppointmentId = newAppointmentId
        rdvData.id = newAppointmentId
        rdvData.management_token = managementToken
        rdvData.appointment_date = newDate
        rdvData.start_time = newTime
      } else {
        // Juste mettre à jour les dates et vider proposed_*
        await supabaseAdmin
          .from('appointments')
          .update({
            appointment_date: newDate,
            start_time: newTime,
            proposed_date: null,
            proposed_start_time: null,
            status: 'accepted'
          })
          .eq('id', id)

        rdvData.appointment_date = newDate
        rdvData.start_time = newTime
      }

      console.log('[PATCH accept] Modification acceptée avec succès')

      // Envoyer email de confirmation au client
      if (rdvData.customer_email && !skipEmail) {
        try {
          const { data: serviceData } = await supabaseAdmin
            .from('services')
            .select('name')
            .eq('id', rdvData.service_id)
            .single()

          const serviceName = serviceData?.name || 'Service'

          // Utiliser le token déjà généré/copié
          const managementToken = rdvData.management_token!
          const managementUrl = `${getSiteUrl()}/rendezvous/manage?id=${activeAppointmentId}&token=${managementToken}`

          console.log('[PATCH accept] Envoi email avec:', { id: activeAppointmentId, tokenLength: managementToken.length })

          await sendAcceptanceEmail({
            nom: rdvData.customer_name,
            email: rdvData.customer_email,
            service: serviceName,
            date: newDate,
            heure: newTime,
            managementUrl
          })
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError)
        }
      }

      // Retourner le succès directement (pas besoin de continuer le traitement)
      return NextResponse.json({
        success: true,
        message: 'Modification acceptée et rendez-vous déplacé'
      })
    }

    // ===================================================
    // STEP 4 : Vérification de conflit lors de l'acceptation
    // ===================================================
    if (newStatus === 'accepted' && rdvData.status === 'pending') {
      // Vérifier si le staff assigné a un conflit
      const { data: conflictCheckResult, error: conflictError } = await supabaseAdmin
        .rpc('check_staff_conflict_for_appointment', {
          p_appointment_id: id
        })

      if (conflictError) {
        console.error('[PATCH accept] Erreur vérification conflit:', conflictError)
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la vérification des disponibilités' },
          { status: 500 }
        )
      }

      // Si conflit détecté, tenter une réassignation automatique
      if (conflictCheckResult?.has_conflict) {
        console.log('[PATCH accept] Conflit détecté, tentative de réassignation automatique')
        
        const { data: reassignResult, error: reassignError } = await supabaseAdmin
          .rpc('reassign_staff_if_available', {
            p_appointment_id: id
          })

        if (reassignError) {
          console.error('[PATCH accept] Erreur réassignation:', reassignError)
          return NextResponse.json(
            { success: false, error: 'Erreur lors de la réassignation automatique' },
            { status: 500 }
          )
        }

        // Si aucun staff disponible, refuser l'acceptation
        if (!reassignResult?.success) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'conflict',
              message: conflictCheckResult.message || 'Ce créneau n\'est plus disponible. Veuillez replanifier le rendez-vous ou réassigner manuellement un autre membre de l\'équipe.',
              conflict_details: conflictCheckResult
            },
            { status: 409 }
          )
        }

        // Réassignation réussie, on continue avec l'acceptation
        console.log('[PATCH accept] Réassignation réussie:', reassignResult.new_staff_name)
      }
    }
    // ===================================================

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

    // Si le rendez-vous est annulé ou refusé, libérer les créneaux associés
    if (newStatus === 'cancelled' || newStatus === 'refused') {
      const { data: slots, error: slotsError } = await supabaseAdmin
        .from('appointment_slots')
        .select('time_slot_id')
        .eq('appointment_id', id)

      if (!slotsError && slots && slots.length > 0) {
        const slotIds = slots.map(s => s.time_slot_id)
        await supabaseAdmin
          .from('time_slots')
          .update({ is_available: true })
          .eq('salon_id', salonId)
          .in('id', slotIds)
        
      }
    }

    // Envoi d'email selon le statut (sauf si skipEmail est activé)
    if (!skipEmail) {
      try {
        // Récupérer le nom du service pour tous les emails
        const { data: serviceData } = await supabaseAdmin
          .from('services')
          .select('name')
          .eq('id', rdvData.service_id)
          .single()

        const serviceName = serviceData?.name || 'Service'

        if (newStatus === 'accepted' && rdvData.customer_email) {
        // Générer ou récupérer le token de gestion
        let managementToken = rdvData.management_token
        if (!managementToken) {
          managementToken = crypto.randomBytes(32).toString('hex')
          await supabaseAdmin
            .from('appointments')
            .update({ management_token: managementToken })
            .eq('id', id)
        }
        
        const managementUrl = `${getSiteUrl()}/rendezvous/manage?id=${id}&token=${managementToken}`
        
        await sendAcceptanceEmail({
          nom: rdvData.customer_name,
          email: rdvData.customer_email,
          service: serviceName,
          date: rdvData.appointment_date,
          heure: rdvData.start_time,
          managementUrl
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
        // Générer ou récupérer le token de gestion pour le lien de replanification
        let managementToken = rdvData.management_token
        if (!managementToken) {
          managementToken = crypto.randomBytes(32).toString('hex')
          await supabaseAdmin
            .from('appointments')
            .update({ management_token: managementToken })
            .eq('id', id)
        }
        
        const managementUrl = `${getSiteUrl()}/rendezvous`
        
        await sendRejectionEmail({
          nom: rdvData.customer_name,
          email: rdvData.customer_email,
          service: serviceName,
          date: rdvData.appointment_date,
          heure: rdvData.start_time,
          managementUrl
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

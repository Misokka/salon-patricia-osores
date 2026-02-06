import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateAppointmentSlots } from '@/lib/appointmentValidation'
import { getSiteUrl } from '@/lib/emailService'
import {
  sendClientModificationRequestToAdmin,
  sendModificationConfirmedToClient,
  sendModificationPendingToClient
} from '@/lib/emailServiceClient'

/**
 * POST /api/rendezvous/modify
 * Permet au client de modifier son rendez-vous
 * Gestion auto-acceptation ou validation manuelle selon paramètre salon
 */
export async function POST(request: Request) {
  try {
    const { appointmentId, token, newDate, newStartTime, required_slot_ids, staff_member_id } = await request.json()

    if (!appointmentId || !token || !newDate || !newStartTime || !required_slot_ids?.length) {
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    // 1. Récupérer le rendez-vous avec toutes les infos
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        appointment_date,
        start_time,
        status,
        management_token,
        salon_id,
        service_id,
        services!inner (
          id,
          name,
          duration_minutes
        ),
        staff_members:staff_member_id (
          id,
          name
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // 2. Vérifier le token
    if (appointment.management_token !== token) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 403 }
      )
    }

    // 3. Vérifier que le RDV n'est pas annulé
    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Ce rendez-vous est déjà annulé' },
        { status: 400 }
      )
    }

    const serviceData = appointment.services as any
    const staffData = appointment.staff_members as any
    const serviceName = Array.isArray(serviceData) 
      ? serviceData[0]?.name 
      : serviceData?.name
    const serviceId = Array.isArray(serviceData) 
      ? serviceData[0]?.id 
      : serviceData?.id
    const serviceDuration = Array.isArray(serviceData) 
      ? serviceData[0]?.duration_minutes 
      : serviceData?.duration_minutes

    // 4. Valider les nouveaux créneaux
    const validation = await validateAppointmentSlots(
      supabaseAdmin,
      serviceId,
      required_slot_ids,
      appointment.salon_id
    )

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Créneaux invalides' },
        { status: 400 }
      )
    }

    // 5. Récupérer le paramètre de validation manuelle
    const { data: salonSettings } = await supabaseAdmin
      .from('salons')
      .select('require_manual_approval')
      .eq('id', appointment.salon_id)
      .single()

    const requireManualApproval = salonSettings?.require_manual_approval ?? true

    const managementUrl = `${getSiteUrl()}/rendezvous/manage?id=${appointmentId}&token=${token}`

    // 6. SELON LE MODE DE VALIDATION
    if (requireManualApproval && appointment.status === 'accepted') {
      // ====== MODE MANUEL + RDV DÉJÀ ACCEPTÉ ======
      // Le client modifie un RDV accepté, le gérant doit revalider
      // On stocke la demande dans proposed_* SANS modifier les dates réelles
      const { error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({
          proposed_date: newDate,
          proposed_start_time: newStartTime,
          status: 'pending' // En attente de validation gérant
        })
        .eq('id', appointmentId)

      if (updateError) {
        throw updateError
      }

      // NE PAS réserver les slots maintenant, on attend la validation du gérant

      // Emails : attente validation + notification gérant
      try {
        await sendModificationPendingToClient({
          nom: appointment.customer_name,
          email: appointment.customer_email,
          service: serviceName || 'Service',
          newDate,
          newTime: newStartTime
        })

        await sendClientModificationRequestToAdmin({
          nom: appointment.customer_name,
          telephone: appointment.customer_phone,
          email: appointment.customer_email,
          service: serviceName || 'Service',
          oldDate: appointment.appointment_date,
          oldTime: appointment.start_time,
          newDate,
          newTime: newStartTime,
          staff_member: staffData?.name,
          requiresApproval: true,
          appointmentId: appointmentId
        })
      } catch (emailError) {
        console.error('Erreur envoi emails:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: 'Demande de modification envoyée. En attente de validation.',
        requiresApproval: true
      })

    } else if (!requireManualApproval || appointment.status === 'pending') {
      // ====== MODE AUTO OU RDV PAS ENCORE ACCEPTÉ ======
      // - Mode auto : modification immédiate → status 'accepted'
      // - RDV pending initial : simple mise à jour des dates → status reste 'pending'

      const wasAlreadyAccepted = appointment.status === 'accepted'
      const newStatus = wasAlreadyAccepted ? 'accepted' : 'pending'

      if (wasAlreadyAccepted) {
        // ====== CAS 1: RDV DÉJÀ ACCEPTÉ (MODE AUTO) ======
        // On peut supprimer/recréer car on envoie un nouvel email avec le nouvel ID

        // Libérer les anciens créneaux
        await supabaseAdmin
          .from('appointment_slots')
          .delete()
          .eq('appointment_id', appointmentId)

        // Appeler la RPC pour réserver avec les nouveaux créneaux
        const { data: rpcResult, error: rpcError } = await supabaseAdmin
          .rpc('book_appointment_with_staff', {
            p_salon_id: appointment.salon_id,
            p_service_id: serviceId,
            p_customer_name: appointment.customer_name,
            p_customer_phone: appointment.customer_phone,
            p_customer_email: appointment.customer_email,
            p_appointment_date: newDate,
            p_start_time: newStartTime,
            p_duration_minutes: serviceDuration,
            p_message: null,
            p_origin: 'client',
            p_initial_status: newStatus,
            p_staff_member_id: staff_member_id || staffData?.id || null
          })

        if (rpcError || !rpcResult?.success) {
          return NextResponse.json(
            { success: false, error: 'Le créneau demandé n\'est plus disponible' },
            { status: 409 }
          )
        }

        // Supprimer l'ancien RDV et garder le nouveau
        const newAppointmentId = rpcResult.appointment_id

        if (newAppointmentId && newAppointmentId !== appointmentId) {
          // Copier le token sur le nouveau RDV
          await supabaseAdmin
            .from('appointments')
            .update({ management_token: token })
            .eq('id', newAppointmentId)

          // Supprimer l'ancien
          await supabaseAdmin
            .from('appointments')
            .delete()
            .eq('id', appointmentId)
        }

        // Créer les liaisons des nouveaux créneaux
        const slotsLinks = required_slot_ids.map((slotId: string, index: number) => ({
          appointment_id: newAppointmentId || appointmentId,
          time_slot_id: slotId,
          slot_order: index + 1,
        }))

        await supabaseAdmin
          .from('appointment_slots')
          .insert(slotsLinks)

        var finalAppointmentId = newAppointmentId || appointmentId
      } else {
        // ====== CAS 2: RDV PENDING (PAS ENCORE ACCEPTÉ) ======
        // NE PAS supprimer/recréer pour garder le même ID (éviter 404 dans l'email du gérant)
        // Juste mettre à jour les champs directement

        // Calculer end_time
        const startDateTime = new Date(`${newDate}T${newStartTime}`)
        const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60000)
        const newEndTime = endDateTime.toTimeString().split(' ')[0].substring(0, 8)

        // Mettre à jour le rendez-vous existant
        const { error: updateError } = await supabaseAdmin
          .from('appointments')
          .update({
            appointment_date: newDate,
            start_time: newStartTime,
            end_time: newEndTime,
            staff_member_id: staff_member_id || staffData?.id || null
          })
          .eq('id', appointmentId)

        if (updateError) {
          return NextResponse.json(
            { success: false, error: 'Erreur lors de la mise à jour' },
            { status: 500 }
          )
        }

        // Supprimer les anciens appointment_slots
        await supabaseAdmin
          .from('appointment_slots')
          .delete()
          .eq('appointment_id', appointmentId)

        // Créer les nouvelles liaisons
        const slotsLinks = required_slot_ids.map((slotId: string, index: number) => ({
          appointment_id: appointmentId,
          time_slot_id: slotId,
          slot_order: index + 1,
        }))

        await supabaseAdmin
          .from('appointment_slots')
          .insert(slotsLinks)

        var finalAppointmentId = appointmentId
      }

      // Emails selon le contexte
      try {
        if (wasAlreadyAccepted) {
          // RDV accepté modifié en mode auto → confirmation client + notification gérant
          // Utiliser le nouvel ID pour l'URL de gestion
          const finalManagementUrl = `${getSiteUrl()}/rendezvous/manage?id=${finalAppointmentId}&token=${token}`

          await sendModificationConfirmedToClient({
            nom: appointment.customer_name,
            email: appointment.customer_email,
            service: serviceName || 'Service',
            newDate,
            newTime: newStartTime,
            managementUrl: finalManagementUrl
          })

          await sendClientModificationRequestToAdmin({
            nom: appointment.customer_name,
            telephone: appointment.customer_phone,
            email: appointment.customer_email,
            service: serviceName || 'Service',
            oldDate: appointment.appointment_date,
            oldTime: appointment.start_time,
            newDate,
            newTime: newStartTime,
            staff_member: staffData?.name,
            requiresApproval: false,
            appointmentId: finalAppointmentId
          })
        }
        // Sinon : RDV pending initial modifié → pas d'email (le gérant verra les nouvelles dates dans l'agenda)
      } catch (emailError) {
        console.error('Erreur envoi emails:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: wasAlreadyAccepted
          ? 'Rendez-vous modifié avec succès'
          : 'Dates mises à jour. En attente de validation du gérant.',
        requiresApproval: !wasAlreadyAccepted,
        newAppointmentId: finalAppointmentId
      })
    }

  } catch (error) {
    console.error('Erreur POST /api/rendezvous/modify:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification' },
      { status: 500 }
    )
  }
}

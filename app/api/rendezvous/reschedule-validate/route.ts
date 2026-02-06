import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendRescheduleConfirmationEmail, sendRescheduleCancelledEmail, sendRescheduleAcceptedToAdmin, sendRescheduleRefusedToAdmin } from '@/lib/emailService'
import salonConfig from '@/config/salon.config'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, accepted } = body

    if (!id || typeof accepted !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    // Récupérer le rendez-vous
    const { data: rdv, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !rdv) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // Vérifier le statut
    if (rdv.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Ce rendez-vous n\'est plus en attente de validation' },
        { status: 400 }
      )
    }

    if (!rdv.proposed_date|| !rdv.proposed_start_time) {
      return NextResponse.json(
        { success: false, error: 'Aucune proposition disponible' },
        { status: 400 }
      )
    }

    if (accepted) {
      // Client accepte : appliquer la modification
      const { error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({
          appointment_date: rdv.proposed_date,
          start_time: rdv.proposed_start_time,
          proposed_date: null,
          proposed_start_time: null,
          status: 'accepted',
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la mise à jour' },
          { status: 500 }
        )
      }

      // Récupérer le nom du service pour les emails
      const { data: serviceData } = await supabaseAdmin
        .from('services')
        .select('name')
        .eq('id', rdv.service_id)
        .single()

      const serviceName = serviceData?.name || 'Service'

      // Envoyer email de confirmation au client
      try {
        const managementUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/rendezvous/manage?id=${rdv.id}&token=${rdv.management_token}`
        
        await sendRescheduleConfirmationEmail({
          nom: rdv.customer_name,
          email: rdv.customer_email,
          date: rdv.proposed_date,
          heure: rdv.proposed_start_time,
          service: serviceName,
          managementUrl,
        })

        // Envoyer email à l'admin pour l'informer de l'acceptation
        await sendRescheduleAcceptedToAdmin({
          nom: rdv.customer_name,
          email: rdv.customer_email,
          date: rdv.proposed_date,
          heure: rdv.proposed_start_time,
          service: serviceName,
        })
      } catch (emailError) {
        // Ne pas bloquer la réponse si l'email échoue
      }

      return NextResponse.json({
        success: true,
        message: 'Rendez-vous modifié avec succès',
      })
    } else {
      // Client refuse : annuler le rendez-vous
      const { error: cancelError } = await supabaseAdmin
        .from('appointments')
        .update({
          proposed_date: null,
          proposed_start_time: null,
          status: 'refused',
        })
        .eq('id', id)

      if (cancelError) {
        return NextResponse.json(
          { success: false, error: 'Erreur lors de l\'annulation' },
          { status: 500 }
        )
      }

      // Libérer les créneaux associés au rendez-vous refusé
      const { data: slots, error: slotsError } = await supabaseAdmin
        .from('appointment_slots')
        .select('time_slot_id')
        .eq('appointment_id', id)

      if (!slotsError && slots && slots.length > 0) {
        const slotIds = slots.map(s => s.time_slot_id)
        await supabaseAdmin
          .from('time_slots')
          .update({ is_available: true })
          .eq('salon_id', rdv.salon_id)
          .in('id', slotIds)
        
      }

      // Récupérer le nom du service pour l'email
      const { data: serviceData } = await supabaseAdmin
        .from('services')
        .select('name')
        .eq('id', rdv.service_id)
        .single()

      const serviceName = serviceData?.name || 'Service'

      // Envoyer email d'annulation au client
      try {
        await sendRescheduleCancelledEmail({
          nom: rdv.customer_name,
          email: rdv.customer_email,
          date: rdv.appointment_date,
          heure: rdv.start_time,
          service: serviceName,
        })

        // Envoyer email à l'admin pour l'informer du refus
        await sendRescheduleRefusedToAdmin({
          nom: rdv.customer_name,
          email: rdv.customer_email,
          service: serviceName,
          proposedDate: rdv.proposed_date,
          proposedTime: rdv.proposed_start_time,
          originalDate: rdv.appointment_date,
          originalTime: rdv.start_time,
          appointmentId: rdv.id,
        })
      } catch (emailError) {
      }

      return NextResponse.json({
        success: true,
        message: 'Rendez-vous annulé',
      })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

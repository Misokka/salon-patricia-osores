export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendRescheduleEmail } from '@/lib/emailService'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * PATCH - Déplace un rendez-vous (modifie date/heure) et envoie email au client
 */
export async function PATCH(request: Request) {
  try {
    // Vérification admin
    const authResult = await verifyAdminAuth()
    if (authResult.error) {
      return authResult.error
    }

    const { id, newDate, newTime, newStaffId } = await request.json()

    if (!id || !newDate || !newTime) {
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    

    // Récupérer le rendez-vous actuel avec info staff
    const { data: rdv, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        staff_members:staff_member_id (
          id,
          name
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !rdv) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que le créneau est disponible
    const { data: existingRdv, error: checkError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('appointment_date', newDate)
      .eq('start_time', newTime)
      .in('status', ['accepted', 'pending'])
      .neq('id', id)
      .maybeSingle()

    if (checkError) {
    }

    if (existingRdv) {
      return NextResponse.json(
        { success: false, error: 'Ce créneau est déjà réservé' },
        { status: 400 }
      )
    }

    // Stocker la proposition de modification dans le RDV (nouveau champs)
    // Le RDV reste inchangé jusqu'à validation client
    // SI PAS D'EMAIL : Accepter automatiquement (le gérant gère lui-même)
    // SI EMAIL : Demander validation au client
    const shouldAutoAccept = !rdv.customer_email
    
    // Déterminer le staff_member_id à utiliser
    const finalStaffId = newStaffId !== undefined ? (newStaffId || null) : rdv.staff_member_id
    const staffChanged = finalStaffId !== rdv.staff_member_id
    
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        proposed_date: shouldAutoAccept ? null : newDate,
        proposed_start_time: shouldAutoAccept ? null : newTime,
        proposed_staff_id: shouldAutoAccept ? null : (staffChanged ? finalStaffId : null),
        appointment_date: shouldAutoAccept ? newDate : rdv.appointment_date,
        start_time: shouldAutoAccept ? newTime : rdv.start_time,
        staff_member_id: shouldAutoAccept ? finalStaffId : rdv.staff_member_id,
        status: shouldAutoAccept ? 'accepted' : 'pending', // Auto-accepté si pas d'email
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[RESCHEDULE] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour: ' + (updateError.message || 'Inconnue') },
        { status: 500 }
      )
    }

    // Si acceptation automatique (pas d'email), gérer les créneaux
    if (shouldAutoAccept) {
      try {
        // Libérer les anciens créneaux
        const { data: oldSlots } = await supabaseAdmin
          .from('appointment_slots')
          .select('time_slot_id')
          .eq('appointment_id', id)

        if (oldSlots && oldSlots.length > 0) {
          const oldSlotIds = oldSlots.map(s => s.time_slot_id)
          await supabaseAdmin
            .from('time_slots')
            .update({ is_available: true })
            .in('id', oldSlotIds)

          // Supprimer les anciennes liaisons
          await supabaseAdmin
            .from('appointment_slots')
            .delete()
            .eq('appointment_id', id)
        }

        // Réserver les nouveaux créneaux
        const { data: serviceData } = await supabaseAdmin
          .from('services')
          .select('duration_minutes')
          .eq('id', rdv.service_id)
          .single()

        if (serviceData) {
          // Utiliser la RPC pour réserver les nouveaux créneaux
          await supabaseAdmin.rpc('reserve_appointment_slots', {
            p_appointment_id: id,
            p_salon_id: rdv.salon_id,
            p_appointment_date: newDate,
            p_start_time: newTime,
            p_duration_minutes: serviceData.duration_minutes,
          })
        }
      } catch (slotError) {
        console.error('Erreur gestion créneaux:', slotError)
      }
    }

    // Envoyer l'email au client si email disponible
    if (rdv.customer_email) {
      try {
        // Récupérer le nom du service
        const { data: serviceData } = await supabaseAdmin
          .from('services')
          .select('name')
          .eq('id', rdv.service_id)
          .single()

        const serviceName = serviceData?.name || 'Service'

        // Formater les dates en français
        const oldDateObj = new Date(`${rdv.appointment_date}T00:00:00`)
        const newDateObj = new Date(`${newDate}T00:00:00`)
        
        const oldDateFormatted = format(oldDateObj, 'yyyy-MM-dd')
        const newDateFormatted = format(newDateObj, 'yyyy-MM-dd')

        // Récupérer les noms des staff si changement
        const oldStaffData = rdv.staff_members as any
        const oldStaffName = oldStaffData?.name || null
        
        let newStaffName = null
        if (staffChanged && finalStaffId) {
          const { data: newStaffData } = await supabaseAdmin
            .from('staff_members')
            .select('name')
            .eq('id', finalStaffId)
            .single()
          newStaffName = newStaffData?.name || null
        } else if (staffChanged) {
          newStaffName = null // Changement vers "aucune préférence"
        }

        await sendRescheduleEmail({
          nom: rdv.customer_name,
          email: rdv.customer_email,
          service: serviceName,
          oldDate: oldDateFormatted,
          oldTime: rdv.start_time,
          newDate: newDateFormatted,
          newTime: newTime,
          rdvId: id,
          staffChanged,
          oldStaffName,
          newStaffName,
        })
      } catch (emailError) {
        // Ne pas bloquer la réponse si l'email échoue
      }
    }

    return NextResponse.json({
      success: true,
      message: shouldAutoAccept 
        ? 'Rendez-vous modifié avec succès' 
        : 'Demande de modification envoyée au client',
      data: updated,
    })
  } catch (error) {
    console.error('[RESCHEDULE] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur: ' + (error instanceof Error ? error.message : 'Inconnue') },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase/admin'
import { 
  sendEmailToPatricia, 
  sendConfirmationToClient, 
  sendAcceptanceEmail,
  sendAutoConfirmedToAdmin,
  getSiteUrl
} from '../../../lib/emailService'
import { PUBLIC_SALON_ID } from '../../../lib/salonContext'
import { validateAppointmentSlots } from '../../../lib/appointmentValidation'
import crypto from 'crypto'

// Types pour la réponse RPC
interface BookAppointmentResult {
  success: boolean
  error?: string
  message?: string
  appointment_id?: string
  staff_member_id?: string
  staff_member_name?: string
  end_time?: string
  data?: Record<string, any>
}

export async function POST(request: Request) {
  try {
    const salonId = PUBLIC_SALON_ID
    const body = await request.json()
    const { nom, telephone, email, service, service_id, date, heure, message, required_slot_ids, staff_member_id } = body

    // Validation des champs obligatoires (CLIENT PUBLIC)
    if (!nom || !nom.trim()) {
      return NextResponse.json(
        { success: false, error: 'Le nom est obligatoire' },
        { status: 400 }
      )
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'L\'adresse email est obligatoire pour confirmer votre réservation' },
        { status: 400 }
      )
    }

    // Validation basique du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'L\'adresse email n\'est pas valide' },
        { status: 400 }
      )
    }

    if (!service || !date || !heure) {
      return NextResponse.json(
        { success: false, error: 'Le service, la date et l\'heure sont obligatoires' },
        { status: 400 }
      )
    }

    // Validation : si multi-créneaux, required_slot_ids doit être fourni
    if (!required_slot_ids || !Array.isArray(required_slot_ids) || required_slot_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Les créneaux requis (required_slot_ids) sont manquants' },
        { status: 400 }
      )
    }

    // 🔒 VALIDATION STRICTE : Vérifier que les créneaux correspondent exactement au service
    const validation = await validateAppointmentSlots(
      supabaseAdmin,
      service_id,
      required_slot_ids,
      salonId
    )

    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error,
          validation_details: validation.details
        },
        { status: 400 }
      )
    }


    // Vérifier atomiquement que TOUS les créneaux requis sont disponibles
    const { data: slotsToCheck, error: checkError } = await supabaseAdmin
      .from('time_slots')
      .select('id, start_time, is_available, salon_id')
      .eq('salon_id', salonId)
      .in('id', required_slot_ids)

    if (checkError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la vérification des créneaux' },
        { status: 500 }
      )
    }

    // Vérifications de sécurité
    if (slotsToCheck.length !== required_slot_ids.length) {
      return NextResponse.json(
        { success: false, error: 'Un ou plusieurs créneaux n\'existent pas' },
        { status: 400 }
      )
    }

    const unavailableSlots = slotsToCheck.filter(slot => !slot.is_available)
    if (unavailableSlots.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Un ou plusieurs créneaux ne sont plus disponibles. Veuillez sélectionner un autre horaire.',
          unavailable_slots: unavailableSlots.map(s => s.start_time)
        },
        { status: 409 } // Conflict
      )
    }

    // Normaliser les données avant insertion (empty string → null)
    const normalizedPhone = telephone?.trim() || null
    const normalizedEmail = email.trim() // Obligatoire, déjà validé
    const normalizedMessage = message?.trim() || null

    // Récupérer la durée du service
    const { data: serviceData, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('name, duration_minutes')
      .eq('id', service_id)
      .single()

    if (serviceError || !serviceData) {
      return NextResponse.json(
        { success: false, error: 'Service introuvable' },
        { status: 404 }
      )
    }

    const serviceName = serviceData.name
    const durationMinutes = serviceData.duration_minutes

    // Récupérer le paramètre de validation manuelle
    const { data: salonSettings } = await supabaseAdmin
      .from('salons')
      .select('require_manual_approval')
      .eq('id', salonId)
      .single()

    const requireManualApproval = salonSettings?.require_manual_approval ?? true
    const initialStatus = requireManualApproval ? 'pending' : 'accepted'

    // ===================================================
    // STEP 3 + STEP 6 : Utiliser la RPC pour assignation atomique
    // Step 6 : Passer staff_member_id si le client a choisi un coiffeur
    // ===================================================
    
    // Validation optionnelle : si staff_member_id fourni, doit être un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (staff_member_id && !uuidRegex.test(staff_member_id)) {
      return NextResponse.json(
        { success: false, error: 'staff_member_id invalide' },
        { status: 400 }
      )
    }
    
    const { data: rpcResult, error: rpcError } = await supabaseAdmin
      .rpc('book_appointment_with_staff', {
        p_salon_id: salonId,
        p_service_id: service_id,
        p_customer_name: nom.trim(),
        p_customer_phone: normalizedPhone,
        p_customer_email: normalizedEmail,
        p_appointment_date: date,
        p_start_time: heure,
        p_duration_minutes: durationMinutes,
        p_message: normalizedMessage,
        p_origin: 'client',
        p_initial_status: initialStatus,
        p_staff_member_id: staff_member_id || null  // Step 6 : null = auto-assign
      }) as { data: BookAppointmentResult | null, error: any }

    if (rpcError) {
      console.error('[POST /api/rendezvous] RPC error:', rpcError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du rendez-vous' },
        { status: 500 }
      )
    }

    // Vérifier si la RPC a retourné une erreur métier
    if (!rpcResult || !rpcResult.success) {
      const errorCode = rpcResult?.error || 'unknown_error'
      const errorMessage = rpcResult?.message || 'Erreur lors de la réservation'
      
      // Erreur "no_staff_available" = aucun staff disponible (auto-assign)
      if (errorCode === 'no_staff_available') {
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage,
            error_code: 'NO_STAFF_AVAILABLE'
          },
          { status: 409 } // Conflict - le créneau n'est plus disponible
        )
      }
      
      // Step 6 : Erreur "staff_not_available" = le coiffeur choisi n'est plus disponible
      if (errorCode === 'staff_not_available') {
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage,
            error_code: 'STAFF_NOT_AVAILABLE'
          },
          { status: 409 } // Conflict - le coiffeur choisi n'est plus disponible
        )
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    const appointmentId = rpcResult.appointment_id!
    const newAppointment = rpcResult.data

    // Générer un token de gestion sécurisé pour le client
    const managementToken = crypto.randomBytes(32).toString('hex')
    
    // Mettre à jour le RDV avec le token
    await supabaseAdmin
      .from('appointments')
      .update({ management_token: managementToken })
      .eq('id', appointmentId)

    // Construire l'URL de gestion
    const managementUrl = `${getSiteUrl()}/rendezvous/manage?id=${appointmentId}&token=${managementToken}`

    // ===================================================
    // STEP 3 MULTI-STAFF : Ne plus bloquer time_slots globalement
    // time_slots = grille d'ouverture, pas occupation
    // L'occupation est gérée par appointments + staff + overlap
    // ===================================================

    // Créer les liaisons dans appointment_slots (pour tracking uniquement)
    const slotsLinks = required_slot_ids.map((slotId: string, index: number) => ({
      appointment_id: appointmentId,
      time_slot_id: slotId,
      slot_order: index + 1,
    }))

    const { error: linksError } = await supabaseAdmin
      .from('appointment_slots')
      .insert(slotsLinks)

    if (linksError) {
      // Log l'erreur mais ne pas rollback (liaison secondaire pour tracking)
      console.error('[POST /api/rendezvous] Error creating appointment_slots:', linksError)
    }

    // Envoi des emails selon le mode de validation
    try {
      if (requireManualApproval) {
        // Mode validation manuelle : email d'attente au client + notification admin
        await sendEmailToPatricia({ nom, telephone, email, service: serviceName, date, heure, message, appointmentId })
        await sendConfirmationToClient({ nom, telephone, email, service: serviceName, date, heure, message, managementUrl })
      } else {
        // Mode auto-acceptation : confirmation immédiate au client
        await sendAcceptanceEmail({ nom, email, service: serviceName, date, heure, managementUrl })
        await sendAutoConfirmedToAdmin({ nom, telephone, email, service: serviceName, date, heure, message, appointmentId })
      }
    } catch (emailError) {
      // On ne retourne pas d'erreur car l'enregistrement a réussi
      return NextResponse.json({
        success: true,
        message: "Demande enregistrée mais l'envoi d'email a échoué",
        data: newAppointment,
        staff_member_name: rpcResult.staff_member_name,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Demande enregistrée et emails envoyés',
      data: newAppointment,
      slots_reserved: required_slot_ids.length,
      staff_member_name: rpcResult.staff_member_name,
    })
  } catch (error) {
    console.error('[POST /api/rendezvous] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

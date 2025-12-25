import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase/admin'
import { sendEmailToPatricia, sendConfirmationToClient } from '../../../lib/emailService'
import { PUBLIC_SALON_ID } from '../../../lib/salonContext'
import { validateAppointmentSlots } from '../../../lib/appointmentValidation'

export async function POST(request: Request) {
  try {
    const salonId = PUBLIC_SALON_ID
    const body = await request.json()
    const { nom, telephone, email, service, service_id, date, heure, message, required_slot_ids } = body

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

    console.log(`🔒 Tentative de réservation : ${required_slot_ids.length} créneaux pour "${service}"`)

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
      .select('id, start_time, is_available')
      .eq('salon_id', PUBLIC_SALON_ID)
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

    // Début de transaction : créer le rendez-vous
    const { data: newAppointment, error: insertError } = await supabaseAdmin
      .from('appointments')
      .insert([
        {
          salon_id: salonId,
          service_id: service_id,
          customer_name: nom.trim(),
          customer_phone: normalizedPhone,
          customer_email: normalizedEmail,
          appointment_date: date,
          start_time: heure,
          status: 'pending',
        },
      ])
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'enregistrement du rendez-vous" },
        { status: 500 }
      )
    }

    const appointmentId = newAppointment.id

    // Marquer tous les créneaux comme non disponibles
    const { error: updateError } = await supabaseAdmin
      .from('time_slots')
      .update({ is_available: false })
      .eq('salon_id', PUBLIC_SALON_ID)
      .in('id', required_slot_ids)

    if (updateError) {
      // Rollback : supprimer le rendez-vous créé
      await supabaseAdmin.from('appointments').delete().eq('id', appointmentId)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la réservation des créneaux' },
        { status: 500 }
      )
    }

    // Créer les liaisons dans appointment_slots
    const slotsLinks = required_slot_ids.map((slotId, index) => ({
      appointment_id: appointmentId,
      time_slot_id: slotId,
      slot_order: index + 1,
    }))

    const { error: linksError } = await supabaseAdmin
      .from('appointment_slots')
      .insert(slotsLinks)

    if (linksError) {
      // Rollback : supprimer le rendez-vous et libérer les créneaux
      await supabaseAdmin.from('appointments').delete().eq('id', appointmentId)
      await supabaseAdmin
        .from('time_slots')
        .update({ is_available: true })
        .eq('salon_id', PUBLIC_SALON_ID)
        .in('id', required_slot_ids)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la liaison des créneaux' },
        { status: 500 }
      )
    }


    // Résoudre le nom du service pour les emails
    const { data: serviceData, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('name')
      .eq('salon_id', PUBLIC_SALON_ID)
      .eq('id', service_id)
      .single()

    const serviceName = serviceData?.name || service

    // Envoi des emails
    try {
      await sendEmailToPatricia({ nom, telephone, email, service: serviceName, date, heure, message })
      await sendConfirmationToClient({ nom, telephone, email, service: serviceName, date, heure, message })
    } catch (emailError) {
      // On ne retourne pas d'erreur car l'enregistrement a réussi
      return NextResponse.json({
        success: true,
        message: "Demande enregistrée mais l'envoi d'email a échoué",
        data: newAppointment,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Demande enregistrée et emails envoyés',
      data: newAppointment,
      slots_reserved: required_slot_ids.length,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

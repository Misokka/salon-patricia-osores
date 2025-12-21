export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'
import { getDefaultSalonId } from '@/lib/salonContext'
import { validateAppointmentSlots } from '@/lib/appointmentValidation'

/**
 * POST - Créer un rendez-vous manuellement (admin uniquement)
 * Utilisé par les coiffeurs pour ajouter des RDV pris par téléphone/sur place
 */
export async function POST(request: Request) {
  // Vérifier que l'utilisateur est admin
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = supabaseAdmin
    const salonId = getDefaultSalonId()
    const body = await request.json()
    
    const {
      service_id,
      service_name,
      date,
      heure,
      customer_name,
      customer_phone,
      customer_email,
      internal_note,
      required_slot_ids
    } = body

    // Validation des champs obligatoires (ADMIN : email optionnel)
    if (!customer_name || !customer_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Le nom du client est obligatoire' },
        { status: 400 }
      )
    }

    if (!service_id || !date || !heure) {
      return NextResponse.json(
        { success: false, error: 'Le service, la date et l\'heure sont obligatoires' },
        { status: 400 }
      )
    }

    if (!required_slot_ids || !Array.isArray(required_slot_ids) || required_slot_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Les créneaux requis sont manquants' },
        { status: 400 }
      )
    }

    console.log(`👨‍💼 Admin "${user.email}" crée un RDV : ${required_slot_ids.length} créneaux pour "${service_name}"`)

    // 🔒 VALIDATION STRICTE : Vérifier que les créneaux correspondent exactement au service
    const validation = await validateAppointmentSlots(
      supabase,
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
    const { data: slotsToCheck, error: checkError } = await supabase
      .from('time_slots')
      .select('id, start_time, is_available')
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
          error: 'Un ou plusieurs créneaux ne sont plus disponibles. Veuillez en sélectionner d\'autres.',
          unavailable_slots: unavailableSlots.map(s => s.start_time)
        },
        { status: 409 }
      )
    }

    // Normaliser les données avant insertion (empty string → null)
    const normalizedPhone = customer_phone?.trim() || null
    const normalizedEmail = customer_email?.trim() || null
    const normalizedNote = internal_note?.trim() || null

    // Créer le rendez-vous avec statut "accepted" (confirmé par admin)
    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert([
        {
          salon_id: salonId,
          service_id: service_id,
          customer_name: customer_name.trim(),
          customer_phone: normalizedPhone,
          customer_email: normalizedEmail,
          appointment_date: date,
          start_time: heure,
          status: 'accepted', // Confirmé directement par l'admin
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
    const { error: updateError } = await supabase
      .from('time_slots')
      .update({ is_available: false })
      .in('id', required_slot_ids)

    if (updateError) {
      // Rollback : supprimer le rendez-vous créé
      await supabase.from('appointments').delete().eq('id', appointmentId)
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

    const { error: linksError } = await supabase
      .from('appointment_slots')
      .insert(slotsLinks)

    if (linksError) {
      // Rollback : supprimer le rendez-vous et libérer les créneaux
      await supabase.from('appointments').delete().eq('id', appointmentId)
      await supabase
        .from('time_slots')
        .update({ is_available: true })
        .in('id', required_slot_ids)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la liaison des créneaux' },
        { status: 500 }
      )
    }


    // Note interne sauvegardée (si besoin d'une table dédiée, à implémenter)
    // Pour l'instant, on pourrait l'ajouter dans une colonne "notes" de appointments

    return NextResponse.json({
      success: true,
      message: 'Rendez-vous créé avec succès',
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

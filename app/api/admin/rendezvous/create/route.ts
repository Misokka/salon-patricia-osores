export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'
import { validateAppointmentSlots } from '@/lib/appointmentValidation'

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

/**
 * POST - Créer un rendez-vous manuellement (admin uniquement)
 * Utilisé par les coiffeurs pour ajouter des RDV pris par téléphone/sur place
 */
export async function POST(request: Request) {
  // Vérifier que l'utilisateur est admin
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
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

    // Validation stricte : Vérifier que les créneaux correspondent exactement au service
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

    const durationMinutes = serviceData.duration_minutes

    // ===================================================
    // STEP 3 : Admin peut spécifier un staff ou auto-assign
    // Si staff_member_id fourni, on l'utilise directement
    // Sinon, on utilise la RPC pour auto-assignation
    // ===================================================
    
    if (body.staff_member_id) {
      // Admin a choisi un staff spécifique - insertion directe
      // Calculer end_time en TypeScript (format HH:mm:ss)
      const [hours, minutes] = heure.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + durationMinutes
      const endHours = Math.floor(totalMinutes / 60) % 24
      const endMins = totalMinutes % 60
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`

      const { data: newAppointment, error: insertError } = await supabaseAdmin
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
            end_time: endTime,
            status: 'accepted',
            origin: 'admin',
            staff_member_id: body.staff_member_id,
          },
        ])
        .select()
        .single()

      if (insertError) {
        console.error('[POST /api/admin/rendezvous/create] Insert error:', insertError)
        return NextResponse.json(
          { success: false, error: "Erreur lors de l'enregistrement du rendez-vous" },
          { status: 500 }
        )
      }

      // Créer les liaisons appointment_slots (tracking uniquement - ne pas bloquer time_slots)
      const slotsLinks = required_slot_ids.map((slotId: string, index: number) => ({
        appointment_id: newAppointment.id,
        time_slot_id: slotId,
        slot_order: index + 1,
      }))

      await supabaseAdmin.from('appointment_slots').insert(slotsLinks)

      return NextResponse.json({
        success: true,
        message: 'Rendez-vous créé avec succès',
        data: newAppointment,
        slots_reserved: required_slot_ids.length,
      })
    }

    // Auto-assignation via RPC
    const { data: rpcResult, error: rpcError } = await supabaseAdmin
      .rpc('book_appointment_with_staff', {
        p_salon_id: salonId,
        p_service_id: service_id,
        p_customer_name: customer_name.trim(),
        p_customer_phone: normalizedPhone,
        p_customer_email: normalizedEmail,
        p_appointment_date: date,
        p_start_time: heure,
        p_duration_minutes: durationMinutes,
        p_message: normalizedNote,
        p_origin: 'admin',
        p_initial_status: 'accepted'
      }) as { data: BookAppointmentResult | null, error: any }

    if (rpcError) {
      console.error('[POST /api/admin/rendezvous/create] RPC error:', rpcError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du rendez-vous' },
        { status: 500 }
      )
    }

    if (!rpcResult || !rpcResult.success) {
      const errorCode = rpcResult?.error || 'unknown_error'
      const errorMessage = rpcResult?.message || 'Erreur lors de la réservation'
      
      if (errorCode === 'no_staff_available') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Aucun membre de l\'équipe n\'est disponible pour ce créneau.',
            error_code: 'NO_STAFF_AVAILABLE'
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    const appointmentId = rpcResult.appointment_id!
    const newAppointment = rpcResult.data

    // Créer les liaisons appointment_slots (tracking uniquement - ne pas bloquer time_slots)
    const slotsLinks = required_slot_ids.map((slotId: string, index: number) => ({
      appointment_id: appointmentId,
      time_slot_id: slotId,
      slot_order: index + 1,
    }))

    await supabaseAdmin.from('appointment_slots').insert(slotsLinks)

    return NextResponse.json({
      success: true,
      message: 'Rendez-vous créé avec succès',
      data: newAppointment,
      slots_reserved: required_slot_ids.length,
      staff_member_name: rpcResult.staff_member_name,
    })
  } catch (error) {
    console.error('[POST /api/admin/rendezvous/create] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendClientCancellationToAdmin } from '@/lib/emailServiceClient'

/**
 * POST /api/rendezvous/cancel
 * Permet au client d'annuler son rendez-vous
 */
export async function POST(request: Request) {
  try {
    const { appointmentId, token } = await request.json()

    if (!appointmentId || !token) {
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    // Récupérer le rendez-vous
    const { data: appointment, error: fetchError} = await supabaseAdmin
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
        services!inner (name),
        staff_members:staff_member_id (name)
      `)
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // Vérifier le token
    if (appointment.management_token !== token) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 403 }
      )
    }

    // Vérifier que le RDV n'est pas déjà annulé
    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Ce rendez-vous est déjà annulé' },
        { status: 400 }
      )
    }

    // Annuler le rendez-vous
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)

    if (updateError) {
      throw updateError
    }

    // Libérer les créneaux associés
    const { error: slotsError } = await supabaseAdmin
      .from('appointment_slots')
      .delete()
      .eq('appointment_id', appointmentId)

    if (slotsError) {
      console.error('Erreur lors de la libération des créneaux:', slotsError)
    }

    // Envoyer email au gérant
    try {
      const serviceData = appointment.services as any
      const staffData = appointment.staff_members as any
      const serviceName = Array.isArray(serviceData) 
        ? serviceData[0]?.name 
        : serviceData?.name
        
      await sendClientCancellationToAdmin({
        nom: appointment.customer_name,
        telephone: appointment.customer_phone,
        email: appointment.customer_email,
        service: serviceName || 'Service',
        date: appointment.appointment_date,
        heure: appointment.start_time,
        staff_member: staffData?.name,
        appointmentId: appointmentId
      })
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError)
      // On ne bloque pas l'annulation même si l'email échoue
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur POST /api/rendezvous/cancel:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'annulation' },
      { status: 500 }
    )
  }
}

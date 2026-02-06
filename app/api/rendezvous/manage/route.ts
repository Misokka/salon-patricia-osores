import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * GET /api/rendezvous/manage
 * Récupère les informations d'un rendez-vous avec vérification par token
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const token = searchParams.get('token')

    console.log('[MANAGE] Requête reçue:', { id, token: token?.substring(0, 10) + '...' })

    if (!id || !token) {
      console.log('[MANAGE] Paramètres manquants')
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    // Récupérer le rendez-vous avec le service
    const { data: appointment, error } = await supabaseAdmin
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
        services (
          id,
          name,
          duration_minutes,
          price_value
        ),
        staff_members:staff_member_id (
          id,
          name
        )
      `)
      .eq('id', id)
      .single()

    // Vérifier aussi sans le single pour voir s'il y a plusieurs résultats
    const { data: allMatches, error: allError } = await supabaseAdmin
      .from('appointments')
      .select('id, management_token, customer_name')
      .eq('id', id)

    console.log('[MANAGE] Recherche RDV:', { 
      id, 
      foundWithSingle: !!appointment, 
      errorSingle: error?.message,
      allMatchesCount: allMatches?.length || 0,
      allMatches: allMatches || []
    })

    console.log('[MANAGE] Résultat query:', { 
      found: !!appointment, 
      error: error?.message,
      hasToken: !!appointment?.management_token 
    })

    if (error || !appointment) {
      console.log('[MANAGE] Rendez-vous introuvable', error)
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // Vérifier le token
    console.log('[MANAGE] Vérification token:', {
      dbToken: appointment.management_token?.substring(0, 10) + '...',
      requestToken: token.substring(0, 10) + '...',
      match: appointment.management_token === token
    })

    if (appointment.management_token !== token) {
      console.log('[MANAGE] Token invalide')
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 403 }
      )
    }

    // Formater les données
    const serviceData = appointment.services as any
    const staffData = appointment.staff_members as any
    const data = {
      id: appointment.id,
      customer_name: appointment.customer_name,
      customer_email: appointment.customer_email,
      customer_phone: appointment.customer_phone,
      service_id: serviceData?.id,
      service_name: serviceData?.name || 'Service non spécifié',
      service_duration: serviceData?.duration_minutes || 0,
      service_price: serviceData?.price_value || 0,
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      status: appointment.status,
      staff_member_id: staffData?.id,
      staff_member_name: staffData?.name
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erreur GET /api/rendezvous/manage:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

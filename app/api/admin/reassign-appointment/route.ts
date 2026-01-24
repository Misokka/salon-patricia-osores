import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PUBLIC_SALON_ID } from '@/lib/salonContext'
import { sendStaffChangeEmail } from '@/lib/emailService'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ReassignResult {
  success: boolean
  error?: string
  message?: string
  old_staff_id?: string
  old_staff_name?: string
  new_staff_id?: string
  new_staff_name?: string
}

interface AvailableStaff {
  staff_id: string
  staff_name: string
  is_original: boolean
}

/**
 * GET - Récupérer les staffs disponibles pour réassigner un RDV
 * Query params:
 * - appointment_id: UUID du RDV
 */
export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    
    const appointmentId = searchParams.get('appointment_id')
    
    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: 'appointment_id est requis' },
        { status: 400 }
      )
    }

    // Appeler la RPC pour trouver les staffs disponibles
    const { data: availableStaff, error } = await supabaseAdmin
      .rpc('find_available_staff_for_reassignment', {
        p_appointment_id: appointmentId
      }) as { data: AvailableStaff[] | null, error: any }

    if (error) {
      console.error('[GET /api/admin/reassign-appointment] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la recherche de staffs disponibles' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        available_staff: availableStaff || [],
        has_available: (availableStaff?.length || 0) > 0
      }
    })

  } catch (error) {
    console.error('[GET /api/admin/reassign-appointment] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST - Réassigner un RDV à un autre staff
 * Body:
 * - appointment_id: UUID du RDV
 * - new_staff_id: UUID du nouveau staff (optionnel, si absent = auto-assign)
 */
export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    
    const { appointment_id, new_staff_id } = body
    
    if (!appointment_id) {
      return NextResponse.json(
        { success: false, error: 'appointment_id est requis' },
        { status: 400 }
      )
    }

    let result: ReassignResult

    if (new_staff_id) {
      // Réassignation manuelle vers un staff spécifique
      const { data, error } = await supabaseAdmin
        .rpc('reassign_appointment_to_staff', {
          p_appointment_id: appointment_id,
          p_new_staff_id: new_staff_id
        }) as { data: ReassignResult | null, error: any }

      if (error) {
        console.error('[POST /api/admin/reassign-appointment] RPC error:', error)
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la réassignation' },
          { status: 500 }
        )
      }

      result = data!
    } else {
      // Réassignation automatique
      const { data, error } = await supabaseAdmin
        .rpc('auto_reassign_appointment', {
          p_appointment_id: appointment_id
        }) as { data: ReassignResult | null, error: any }

      if (error) {
        console.error('[POST /api/admin/reassign-appointment] Auto RPC error:', error)
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la réassignation automatique' },
          { status: 500 }
        )
      }

      result = data!
    }

    if (!result.success) {
      // Erreur métier (pas de staff dispo, etc.)
      return NextResponse.json(
        { 
          success: false, 
          error: result.message || 'Erreur lors de la réassignation',
          error_code: result.error
        },
        { status: 409 }
      )
    }

    // Récupérer les infos du RDV pour l'email
    try {
      const { data: appointmentData } = await supabaseAdmin
        .from('appointments')
        .select(`
          id,
          customer_name,
          customer_email,
          appointment_date,
          start_time,
          services (name)
        `)
        .eq('id', appointment_id)
        .single()

      if (appointmentData?.customer_email && result.old_staff_name && result.new_staff_name) {
        // Envoyer email au client
        const serviceName = Array.isArray(appointmentData.services) 
          ? appointmentData.services[0]?.name 
          : (appointmentData.services as any)?.name || 'Votre service'
        
        await sendStaffChangeEmail({
          nom: appointmentData.customer_name,
          email: appointmentData.customer_email,
          service: serviceName,
          date: appointmentData.appointment_date,
          heure: appointmentData.start_time,
          oldStaffName: result.old_staff_name,
          newStaffName: result.new_staff_name,
        })
        console.log('[POST /api/admin/reassign-appointment] Email changement staff envoyé au client')
      }
    } catch (emailError) {
      // Ne pas bloquer la réassignation si l'email échoue
      console.error('[POST /api/admin/reassign-appointment] Erreur envoi email:', emailError)
    }

    return NextResponse.json({
      success: true,
      data: {
        message: result.message,
        old_staff: {
          id: result.old_staff_id,
          name: result.old_staff_name
        },
        new_staff: {
          id: result.new_staff_id,
          name: result.new_staff_name
        }
      }
    })

  } catch (error) {
    console.error('[POST /api/admin/reassign-appointment] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

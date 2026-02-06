export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'

/**
 * PATCH - Réassigner un staff member à un rendez-vous
 * Body: { staff_member_id: string }
 */
export async function PATCH(
  request: Request,
  context: any
) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { id: appointmentId } = await context.params
    const body = await request.json()
    const { staff_member_id } = body

    if (!staff_member_id) {
      return NextResponse.json(
        { success: false, error: 'staff_member_id est obligatoire' },
        { status: 400 }
      )
    }

    // 1. Vérifier que le rendez-vous existe et appartient au salon
    const { data: appointment, error: fetchAppError } = await supabaseAdmin
      .from('appointments')
      .select('id, salon_id, status')
      .eq('id', appointmentId)
      .eq('salon_id', salonId)
      .single()

    if (fetchAppError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // 2. Vérifier que le staff member existe, appartient au même salon et est actif
    const { data: staffMember, error: fetchStaffError } = await supabaseAdmin
      .from('staff_members')
      .select('id, name, is_active')
      .eq('id', staff_member_id)
      .eq('salon_id', salonId)
      .single()

    if (fetchStaffError || !staffMember) {
      return NextResponse.json(
        { success: false, error: 'Membre de l\'équipe introuvable' },
        { status: 404 }
      )
    }

    if (!staffMember.is_active) {
      return NextResponse.json(
        { success: false, error: 'Ce membre de l\'équipe est inactif et ne peut pas être assigné' },
        { status: 400 }
      )
    }

    // 3. Mettre à jour l'assignation
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({ staff_member_id })
      .eq('id', appointmentId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/admin/appointments/[id]/assign-staff] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la réassignation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Rendez-vous assigné à ${staffMember.name}`,
      data: {
        ...updatedAppointment,
        staff_member_name: staffMember.name
      }
    })
  } catch (error) {
    console.error('[PATCH /api/admin/appointments/[id]/assign-staff] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * GET - Récupérer les détails d'un rendez-vous avec le staff assigné
 */
export async function GET(
  request: Request,
  context: any
) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { id: appointmentId } = await context.params

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        services (id, name, duration_minutes),
        staff_members:staff_member_id (id, name, is_active)
      `)
      .eq('id', appointmentId)
      .eq('salon_id', salonId)
      .single()

    if (error || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // Construire les timestamps complets en combinant date + time
    const appointmentDate = appointment.appointment_date
    const startTime = appointment.start_time
    const endTime = appointment.end_time

    // Créer des timestamps ISO complets
    const startDateTime = `${appointmentDate}T${startTime}`
    const endDateTime = `${appointmentDate}T${endTime}`

    return NextResponse.json({
      success: true,
      data: {
        ...appointment,
        service_name: appointment.services?.name || 'Service inconnu',
        service_duration: appointment.services?.duration_minutes ?? null,
        service_duration_minutes: appointment.services?.duration_minutes ?? null,
        staff_member_name: appointment.staff_members?.name || null,
        staff_member_is_active: appointment.staff_members?.is_active ?? null,
        // Ajouter les timestamps complets pour le modal
        start_time: startDateTime,
        end_time: endDateTime,
      }
    })
  } catch (error) {
    console.error('[GET /api/admin/appointments/[id]] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

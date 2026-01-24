export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'

/**
 * GET - Récupère toutes les absences du salon
 * Query params optionnels:
 * - staff_member_id: filtrer par staff
 * - from_date: date de début (format YYYY-MM-DD)
 * - to_date: date de fin (format YYYY-MM-DD)
 */
export async function GET(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const staffMemberId = searchParams.get('staff_member_id')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    // Utiliser la fonction RPC get_staff_absences
    const { data, error } = await supabaseAdmin.rpc('get_staff_absences', {
      p_salon_id: salonId,
      p_staff_member_id: staffMemberId || null,
      p_from_date: fromDate || new Date().toISOString().split('T')[0],
      p_to_date: toDate || null
    })

    if (error) {
      console.error('[GET /api/admin/staff-absences] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des absences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    console.error('[GET /api/admin/staff-absences] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST - Créer une nouvelle absence
 */
export async function POST(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const { staff_member_id, start_datetime, end_datetime, reason } = body

    // Validations
    if (!staff_member_id || !start_datetime || !end_datetime) {
      return NextResponse.json(
        { success: false, error: 'staff_member_id, start_datetime et end_datetime sont obligatoires' },
        { status: 400 }
      )
    }

    // Vérifier que end > start
    const startDate = new Date(start_datetime)
    const endDate = new Date(end_datetime)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Format de date invalide' },
        { status: 400 }
      )
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: 'La date de fin doit être après la date de début' },
        { status: 400 }
      )
    }

    // Vérifier que le staff appartient au salon
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff_members')
      .select('id')
      .eq('id', staff_member_id)
      .eq('salon_id', salonId)
      .single()

    if (staffError || !staffData) {
      return NextResponse.json(
        { success: false, error: 'Membre d\'équipe non trouvé ou n\'appartient pas à ce salon' },
        { status: 404 }
      )
    }

    // Vérifier les overlaps (absence existante pour ce staff sur cette période)
    const { data: existingAbsences } = await supabaseAdmin
      .from('staff_absences')
      .select('id')
      .eq('salon_id', salonId)
      .eq('staff_member_id', staff_member_id)
      .lt('start_datetime', end_datetime)
      .gt('end_datetime', start_datetime)

    if (existingAbsences && existingAbsences.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Une absence existe déjà pour ce membre sur cette période' },
        { status: 409 }
      )
    }

    // Créer l'absence
    const { data, error } = await supabaseAdmin
      .from('staff_absences')
      .insert({
        salon_id: salonId,
        staff_member_id,
        start_datetime,
        end_datetime,
        reason: reason || null
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/admin/staff-absences] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de l\'absence' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/staff-absences] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Modifier une absence existante
 */
export async function PUT(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, start_datetime, end_datetime, reason } = body

    // Validations
    if (!id || !start_datetime || !end_datetime) {
      return NextResponse.json(
        { success: false, error: 'id, start_datetime et end_datetime sont obligatoires' },
        { status: 400 }
      )
    }

    // Vérifier que end > start
    const startDate = new Date(start_datetime)
    const endDate = new Date(end_datetime)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Format de date invalide' },
        { status: 400 }
      )
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: 'La date de fin doit être après la date de début' },
        { status: 400 }
      )
    }

    // Vérifier que l'absence existe et appartient au salon
    const { data: existingAbsence, error: checkError } = await supabaseAdmin
      .from('staff_absences')
      .select('id, staff_member_id')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (checkError || !existingAbsence) {
      return NextResponse.json(
        { success: false, error: 'Absence non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les overlaps (absences existantes SAUF celle-ci)
    const { data: overlappingAbsences } = await supabaseAdmin
      .from('staff_absences')
      .select('id')
      .eq('salon_id', salonId)
      .eq('staff_member_id', existingAbsence.staff_member_id)
      .neq('id', id)
      .lt('start_datetime', end_datetime)
      .gt('end_datetime', start_datetime)

    if (overlappingAbsences && overlappingAbsences.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Une absence existe déjà pour ce membre sur cette période' },
        { status: 409 }
      )
    }

    // Mettre à jour
    const { data, error } = await supabaseAdmin
      .from('staff_absences')
      .update({
        start_datetime,
        end_datetime,
        reason: reason || null
      })
      .eq('id', id)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) {
      console.error('[PUT /api/admin/staff-absences] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour de l\'absence' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('[PUT /api/admin/staff-absences] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Supprimer une absence
 */
export async function DELETE(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id est obligatoire' },
        { status: 400 }
      )
    }

    // Vérifier que l'absence existe et appartient au salon
    const { data: existingAbsence, error: checkError } = await supabaseAdmin
      .from('staff_absences')
      .select('id')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (checkError || !existingAbsence) {
      return NextResponse.json(
        { success: false, error: 'Absence non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer
    const { error } = await supabaseAdmin
      .from('staff_absences')
      .delete()
      .eq('id', id)
      .eq('salon_id', salonId)

    if (error) {
      console.error('[DELETE /api/admin/staff-absences] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression de l\'absence' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('[DELETE /api/admin/staff-absences] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

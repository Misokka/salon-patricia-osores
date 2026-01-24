import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PUBLIC_SALON_ID } from '@/lib/salonContext'

interface ConflictResult {
  appointment_id: string
  customer_name: string
  service_name: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
}

/**
 * GET - Récupérer les conflits pour une absence potentielle
 * Query params:
 * - staff_member_id: UUID du staff
 * - start_datetime: ISO string
 * - end_datetime: ISO string
 */
export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    
    const staffMemberId = searchParams.get('staff_member_id')
    const startDatetime = searchParams.get('start_datetime')
    const endDatetime = searchParams.get('end_datetime')
    
    if (!staffMemberId || !startDatetime || !endDatetime) {
      return NextResponse.json(
        { success: false, error: 'staff_member_id, start_datetime et end_datetime sont requis' },
        { status: 400 }
      )
    }

    // Appeler la RPC pour compter les conflits
    const { data: count, error: countError } = await supabaseAdmin
      .rpc('count_appointments_conflicting_with_absence', {
        p_staff_member_id: staffMemberId,
        p_start_datetime: startDatetime,
        p_end_datetime: endDatetime
      })

    if (countError) {
      console.error('[GET /api/admin/absence-conflicts] Count error:', countError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors du comptage des conflits' },
        { status: 500 }
      )
    }

    // Si on veut aussi les détails, appeler la RPC complète
    const { data: conflicts, error: conflictsError } = await supabaseAdmin
      .rpc('get_appointments_conflicting_with_absence', {
        p_staff_member_id: staffMemberId,
        p_start_datetime: startDatetime,
        p_end_datetime: endDatetime
      }) as { data: ConflictResult[] | null, error: any }

    if (conflictsError) {
      console.error('[GET /api/admin/absence-conflicts] Conflicts error:', conflictsError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des conflits' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        count: count || 0,
        appointments: conflicts || []
      }
    })

  } catch (error) {
    console.error('[GET /api/admin/absence-conflicts] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

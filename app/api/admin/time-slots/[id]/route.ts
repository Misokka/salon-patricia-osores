export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../../lib/auth/verifyAdmin'

export async function DELETE(
  request: Request,
  context: any
) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { id } = await context.params


    // 1. Vérifier que le créneau appartient bien au salon
    const { data: slot, error: fetchError } = await supabaseAdmin
      .from('time_slots')
      .select('id, slot_date, start_time, is_available')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (fetchError || !slot) {
      return NextResponse.json(
        { success: false, error: 'Créneau introuvable' },
        { status: 404 }
      )
    }

    // 2. Vérifier si le créneau est lié à un rendez-vous
    const { data: linkedAppointment, error: linkError } = await supabaseAdmin
      .from('appointment_slots')
      .select('appointment_id')
      .eq('time_slot_id', id)
      .maybeSingle()

    if (linkError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la vérification' },
        { status: 500 }
      )
    }

    // 3. Si lié à un rendez-vous, refuser la suppression
    if (linkedAppointment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Impossible de supprimer un créneau réservé. Veuillez d\'abord annuler le rendez-vous associé.',
          linked: true
        },
        { status: 409 } // Conflict
      )
    }

    // 4. Supprimer le créneau (il n'est lié à aucun rendez-vous)
    const { error: deleteError } = await supabaseAdmin
      .from('time_slots')
      .delete()
      .eq('id', id)
      .eq('salon_id', salonId)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

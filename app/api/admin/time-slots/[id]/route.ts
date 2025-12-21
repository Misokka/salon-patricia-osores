export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../../lib/salonContext'

export async function DELETE(
  request: Request,
  context: any
) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = supabaseAdmin
    const { id } = context.params
    const salonId = getDefaultSalonId()

    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id)
      .eq('salon_id', salonId)

    if (error) {
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

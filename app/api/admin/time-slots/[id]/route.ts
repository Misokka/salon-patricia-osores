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
    
    const { id } = context.params

    const { error } = await supabaseAdmin
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

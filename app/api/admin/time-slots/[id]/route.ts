import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '../../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../../lib/salonContext'

export async function DELETE(
  request: Request,
  context: any
) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const { id } = context.params
    const salonId = getDefaultSalonId()

    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id)
      .eq('salon_id', salonId)

    if (error) {
      console.error('Erreur Supabase DELETE time slot:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur API DELETE time slot:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

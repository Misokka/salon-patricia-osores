import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'

/**
 * GET — Récupérer les paramètres du salon
 */
export async function GET() {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('salons')
      .select('id, name, require_manual_approval')
      .eq('id', salonId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — Mettre à jour les paramètres du salon
 */
export async function PATCH(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { require_manual_approval } = body

    // Validation
    if (typeof require_manual_approval !== 'boolean') {
      return NextResponse.json(
        { error: 'Le paramètre require_manual_approval doit être un booléen' },
        { status: 400 }
      )
    }

    // Mise à jour
    const { data, error } = await supabaseAdmin
      .from('salons')
      .update({ require_manual_approval })
      .eq('id', salonId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    )
  }
}

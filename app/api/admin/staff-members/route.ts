export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'

/**
 * GET - Récupère tous les membres de l'équipe du salon
 */
export async function GET() {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .select('*')
      .eq('salon_id', salonId)
      .order('position', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('[GET /api/admin/staff-members] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération de l\'équipe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    console.error('[GET /api/admin/staff-members] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST - Créer un nouveau membre de l'équipe
 */
export async function POST(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Le nom est obligatoire' },
        { status: 400 }
      )
    }

    // Récupérer la position max actuelle
    const { data: maxPositionData } = await supabaseAdmin
      .from('staff_members')
      .select('position')
      .eq('salon_id', salonId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPositionData?.position ?? -1) + 1

    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .insert({
        salon_id: salonId,
        name: name.trim(),
        is_active: true,
        position: nextPosition,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/admin/staff-members] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du membre' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('[POST /api/admin/staff-members] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

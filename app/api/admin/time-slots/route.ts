export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'

/**
 * GET - Récupère tous les créneaux (time slots)
 */
export async function GET() {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
    const { data, error } = await supabaseAdmin
      .from('time_slots')
      .select('*')
      .eq('salon_id', salonId)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des créneaux' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST - Crée un ou plusieurs créneaux
 */
export async function POST(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
    const body = await request.json()
    const { slot_date, start_times } = body

    if (!slot_date || !start_times || !Array.isArray(start_times)) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    const slots = start_times.map((time) => ({
      salon_id: salonId,
      slot_date,
      start_time: time,
      is_available: true,
    }))

    const { data, error } = await supabaseAdmin
      .from('time_slots')
      .insert(slots)
      .select()

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création des créneaux' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Supprime un ou plusieurs créneaux
 */
export async function DELETE(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    
    const { searchParams } = new URL(request.url)
    const slot_date = searchParams.get('slot_date')

    if (slot_date) {
      // Supprimer tous les créneaux d'une date
      const { error } = await supabaseAdmin
        .from('time_slots')
        .delete()
        .eq('slot_date', slot_date)
        .eq('salon_id', salonId)

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la suppression' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Paramètre slot_date manquant' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

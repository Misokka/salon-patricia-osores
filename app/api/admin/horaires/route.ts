import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../lib/salonContext'

/**
 * GET — Opening days + time ranges + salon settings
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const salonId = getDefaultSalonId()

    const [salonRes, daysRes, rangesRes] = await Promise.all([
      supabase
        .from('salons')
        .select('online_booking_enabled')
        .eq('id', salonId)
        .single(),

      supabase
        .from('opening_days')
        .select('*')
        .eq('salon_id', salonId)
        .order('day_of_week'),

      supabase
        .from('opening_time_ranges')
        .select('*')
        .eq('salon_id', salonId)
        .order('day_of_week')
        .order('start_time'),
    ])

    if (salonRes.error) throw salonRes.error
    if (daysRes.error) throw daysRes.error
    if (rangesRes.error) throw rangesRes.error

    return NextResponse.json({
      success: true,
      data: {
        settings: {
          online_booking_enabled: salonRes.data?.online_booking_enabled ?? true,
          default_slot_frequency_minutes: 30, // Default value
        },
        hours: daysRes.data ?? [],
        ranges: rangesRes.data ?? [],
      },
    })
  } catch (error) {
    console.error('GET horaires admin error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST — Update opening days OR add time range
 */
export async function POST(request: Request) {
  const { error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const salonId = getDefaultSalonId()
    const body = await request.json()
    const { type, data } = body

    if (type === 'settings') {
      // Update salon settings (online booking)
      const { online_booking_enabled } = data

      const { error } = await supabase
        .from('salons')
        .update({ online_booking_enabled })
        .eq('id', salonId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (type === 'day') {
      const { day_of_week, is_open } = data

      const { error } = await supabase
        .from('opening_days')
        .upsert({
          salon_id: salonId,
          day_of_week,
          is_open,
        }, {
          onConflict: 'salon_id,day_of_week'
        })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (type === 'range') {
      const { day_of_week, start_time, end_time, slot_frequency_minutes } = data

      const { data: newRange, error } = await supabase
        .from('opening_time_ranges')
        .insert({
          salon_id: salonId,
          day_of_week,
          start_time,
          end_time,
          slot_frequency_minutes,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, data: newRange })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('POST horaires admin error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH — Update a time range (NO slot generation here)
 */
export async function PATCH(request: Request) {
  const { error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, start_time, end_time, slot_frequency_minutes } = body

    const { error } = await supabase
      .from('opening_time_ranges')
      .update({ start_time, end_time, slot_frequency_minutes })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH horaires admin error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE — Delete a time range
 * (slots cleanup is delegated or optional)
 */
export async function DELETE(request: Request) {
  const { error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('opening_time_ranges')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE horaires admin error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase/admin'
import { verifyAdminAuth } from '../../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../../lib/salonContext'
import { format, addDays, isBefore, startOfDay } from 'date-fns'

/**
 * POST — Generate time slots
 */
export async function POST(request: Request) {
  const { error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const salonId = getDefaultSalonId()
    const body = await request.json()

    const {
      start_date,
      end_date,
      day_of_week,
      start_time,
      end_time,
      slot_frequency_minutes,
    } = body

    if (
      !start_date ||
      !end_date ||
      day_of_week === undefined ||
      !start_time ||
      !end_time ||
      !slot_frequency_minutes
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing parameters' },
        { status: 400 }
      )
    }

    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    const today = startOfDay(new Date())

    const slotsToInsert: any[] = []
    let currentDate = startDate

    while (currentDate <= endDate) {
      if (isBefore(currentDate, today)) {
        currentDate = addDays(currentDate, 1)
        continue
      }

      const dayIndex = (currentDate.getDay() + 6) % 7
      if (dayIndex === day_of_week) {
        const startMinutes = parseTime(start_time)
        const endMinutes = parseTime(end_time)

        for (
          let minutes = startMinutes;
          minutes < endMinutes;
          minutes += slot_frequency_minutes
        ) {
          const timeString = formatMinutesToTime(minutes)
          const dateString = format(currentDate, 'yyyy-MM-dd')

          slotsToInsert.push({
            salon_id: salonId,
            slot_date: dateString,
            start_time: timeString,
            is_available: true,
          })
        }
      }

      currentDate = addDays(currentDate, 1)
    }

    if (slotsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No slots to generate',
      })
    }

    // Prevent duplicates
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('time_slots')
      .select('slot_date, start_time')
      .eq('salon_id', salonId)
      .gte('slot_date', format(startDate, 'yyyy-MM-dd'))
      .lte('slot_date', format(endDate, 'yyyy-MM-dd'))

    if (fetchError) throw fetchError

    const existingSet = new Set(
      (existing || []).map(
        (e) => `${e.slot_date}_${e.start_time}`
      )
    )

    const uniqueSlots = slotsToInsert.filter(
      (slot) =>
        !existingSet.has(`${slot.slot_date}_${slot.start_time}`)
    )

    if (uniqueSlots.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'All slots already exist',
      })
    }

    const { error: insertError } = await supabaseAdmin
      .from('time_slots')
      .insert(uniqueSlots)

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      count: uniqueSlots.length,
      message: `${uniqueSlots.length} slots generated`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/* =====================
   Utils
===================== */

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`
}

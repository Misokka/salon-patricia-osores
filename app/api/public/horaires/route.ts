export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDefaultSalonId } from '../../../../lib/salonContext'
import { format, parseISO, isWithinInterval } from 'date-fns'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const DAYS_FR = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

interface TimeRange {
  start_time: string
  end_time: string
}

interface DaySchedule {
  day: string
  dayOfWeek: number
  isOpen: boolean
  isExceptional: boolean
  exceptionalReason?: string
  ranges: TimeRange[]
}

/**
 * GET — Public salon opening hours
 */
export async function GET() {
  try {
    const salonId = getDefaultSalonId()
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    /* =====================
       1. Standard opening days
    ===================== */
    const { data: openingDays, error: daysError } = await getSupabase()
      .from('opening_days')
      .select('day_of_week, is_open')
      .eq('salon_id', salonId)

    if (daysError) throw daysError

    /* =====================
       2. Standard time ranges
    ===================== */
    const { data: timeRanges, error: rangesError } = await getSupabase()
      .from('opening_time_ranges')
      .select('day_of_week, start_time, end_time')
      .eq('salon_id', salonId)
      .order('day_of_week')
      .order('start_time')

    if (rangesError) throw rangesError

    /* =====================
       3. Active exceptional periods
    ===================== */
    const { data: exceptionalPeriods, error: exceptionalError } = await getSupabase()
      .from('exceptional_periods')
      .select(`
        id,
        start_date,
        end_date,
        type,
        reason,
        exceptional_time_ranges (
          day_of_week,
          start_time,
          end_time
        )
      `)
      .eq('salon_id', salonId)
      .gte('end_date', todayStr)
      .order('start_date')

    if (exceptionalError) throw exceptionalError

    /* =====================
       4. Build weekly schedule
    ===================== */
    const schedule: DaySchedule[] = []

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayName = DAYS_FR[dayOfWeek]

      const standardDay = openingDays?.find(
        (d) => d.day_of_week === dayOfWeek
      )

      const isStandardOpen = standardDay?.is_open ?? false

      const standardRanges = (timeRanges || [])
        .filter((r) => r.day_of_week === dayOfWeek)
        .map((r) => ({
          start_time: r.start_time.slice(0, 5),
          end_time: r.end_time.slice(0, 5),
        }))

      // Compute calendar date for this weekday
      const baseDate = new Date()
      const baseDayIndex = (baseDate.getDay() + 6) % 7
      baseDate.setDate(
        baseDate.getDate() + ((dayOfWeek - baseDayIndex + 7) % 7)
      )

      const dateStr = format(baseDate, 'yyyy-MM-dd')

      const exceptional = (exceptionalPeriods || []).find((p) =>
        isWithinInterval(parseISO(dateStr), {
          start: parseISO(p.start_date),
          end: parseISO(p.end_date),
        })
      )

      if (exceptional) {
        if (exceptional.type === 'closed') {
          schedule.push({
            day: dayName,
            dayOfWeek,
            isOpen: false,
            isExceptional: true,
            exceptionalReason:
              exceptional.reason || 'Fermé exceptionnellement',
            ranges: [],
          })
        } else {
          const exceptionalRanges = (
            exceptional.exceptional_time_ranges || []
          ).map((r: any) => ({
            start_time: r.start_time.slice(0, 5),
            end_time: r.end_time.slice(0, 5),
          }))

          schedule.push({
            day: dayName,
            dayOfWeek,
            isOpen: exceptionalRanges.length > 0,
            isExceptional: true,
            exceptionalReason:
              exceptional.reason || 'Ouvert exceptionnellement',
            ranges: exceptionalRanges,
          })
        }
      } else {
        schedule.push({
          day: dayName,
          dayOfWeek,
          isOpen: isStandardOpen,
          isExceptional: false,
          ranges: isStandardOpen ? standardRanges : [],
        })
      }
    }

    return NextResponse.json({ success: true, data: schedule })
  } catch (error) {
    console.error('Public opening hours error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

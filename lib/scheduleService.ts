import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { format, parseISO, isWithinInterval } from 'date-fns'
import { PUBLIC_SALON_ID } from './salonContext'

const DAYS_FR_TO_EN: Record<number, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
}

interface OpeningHoursSpec {
  '@type': 'OpeningHoursSpecification'
  dayOfWeek: string[]
  opens: string
  closes: string
}

/**
 * Génère les horaires au format Schema.org pour le SEO
 * Version serveur - utilisée dans les métadonnées statiques
 */
export async function generateSchemaOpeningHours(): Promise<OpeningHoursSpec[]> {
  try {
    const salonId = PUBLIC_SALON_ID
    const today = format(new Date(), 'yyyy-MM-dd')

    // 1. Récupérer les horaires standards
    const { data: standardHours } = await supabase
      .from('salon_hours')
      .select('day_of_week, is_open')
      .eq('salon_id', salonId)
      .eq('is_open', true)

    // 2. Récupérer les plages horaires standards
    const { data: standardRanges } = await supabase
      .from('salon_time_ranges')
      .select('day_of_week, start_time, end_time')
      .eq('salon_id', salonId)
      .order('day_of_week')
      .order('start_time')

    if (!standardHours || !standardRanges) {
      return []
    }

    // 3. Construire les specs pour chaque jour ouvert
    const specs: OpeningHoursSpec[] = []

    for (const dayData of standardHours) {
      const dayOfWeek = dayData.day_of_week
      const ranges = standardRanges.filter((r) => r.day_of_week === dayOfWeek)

      if (ranges.length === 0) continue

      // Pour Schema.org, on prend la première plage (ou on pourrait fusionner)
      const firstRange = ranges[0]
      const lastRange = ranges[ranges.length - 1]

      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [DAYS_FR_TO_EN[dayOfWeek]],
        opens: firstRange.start_time.substring(0, 5),
        closes: lastRange.end_time.substring(0, 5),
      })
    }

    return specs
  } catch (error) {
    console.error('Erreur génération Schema.org horaires:', error)
    return []
  }
}

/**
 * Récupère les horaires dynamiques pour l'affichage côté serveur (RSC)
 * Utile pour le SSR et les métadonnées
 */
export async function getPublicScheduleServer() {
  try {
    const salonId = PUBLIC_SALON_ID
    const today = format(new Date(), 'yyyy-MM-dd')

    // Récupérer toutes les données nécessaires
    const [
      { data: standardHours },
      { data: standardRanges },
      { data: exceptionalHours },
    ] = await Promise.all([
      supabase
        .from('salon_hours')
        .select('day_of_week, is_open')
        .eq('salon_id', salonId)
        .order('day_of_week'),
      supabase
        .from('salon_time_ranges')
        .select('day_of_week, start_time, end_time')
        .eq('salon_id', salonId)
        .order('day_of_week')
        .order('start_time'),
      supabase
        .from('salon_exceptional_hours')
        .select(`
          id,
          start_date,
          end_date,
          type,
          reason,
          salon_exceptional_time_ranges (
            day_of_week,
            start_time,
            end_time
          )
        `)
        .eq('salon_id', salonId)
        .gte('end_date', today)
        .order('start_date'),
    ])

    return {
      standardHours: standardHours || [],
      standardRanges: standardRanges || [],
      exceptionalHours: exceptionalHours || [],
    }
  } catch (error) {
    console.error('Erreur récupération horaires serveur:', error)
    return {
      standardHours: [],
      standardRanges: [],
      exceptionalHours: [],
    }
  }
}

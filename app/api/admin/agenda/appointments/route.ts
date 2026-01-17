export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns'
import { salonConfig } from '@/config/salon.config'

/**
 * Convertit une date+heure locale (du salon) en Date UTC
 * Nécessaire car BDD stocke DATE + TIME sans timezone
 * @param dateStr Format: YYYY-MM-DD
 * @param timeStr Format: HH:mm:ss
 * @returns Date object en UTC représentant l'heure locale du salon
 */
function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  // Extraire composants temporels
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  
  // Créer date locale dans la timezone du salon (Europe/Brussels = UTC+1/+2)
  // On utilise le format ISO avec offset pour forcer l'interprétation
  const salonTz = salonConfig.schedule.timezone // "Europe/Brussels"
  
  // Créer un formatteur pour obtenir l'offset de la timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: salonTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'longOffset'
  })
  
  // Créer une date arbitraire dans la timezone du salon pour obtenir l'offset
  const sampleDate = new Date(year, month - 1, day, hours, minutes, 0)
  const parts = formatter.formatToParts(sampleDate)
  const offset = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+01:00'
  
  // Construire l'ISO string avec l'offset correct
  const isoWithOffset = `${dateStr}T${timeStr.substring(0, 5)}:00${offset.replace('GMT', '')}`
  
  return new Date(isoWithOffset)
}

/**
 * GET - Récupère les rendez-vous pour l'agenda admin
 * Query params:
 * - date: Date ISO (YYYY-MM-DD)
 * - viewMode: 'day' | 'week'
 * - collaboratorIds: string[] (optionnel)
 */
export async function GET(request: Request) {
  const { salonId, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const viewMode = searchParams.get('viewMode') || 'day'
    const collaboratorIdsParam = searchParams.get('collaboratorIds')

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: 'Date manquante' },
        { status: 400 }
      )
    }

    const targetDate = new Date(dateParam)

    // Calculer la plage de dates selon le mode
    let startDate: Date
    let endDate: Date

    if (viewMode === 'week') {
      startDate = startOfWeek(targetDate, { weekStartsOn: 1 }) // Lundi
      endDate = endOfWeek(targetDate, { weekStartsOn: 1 }) // Dimanche
    } else {
      startDate = startOfDay(targetDate)
      endDate = endOfDay(targetDate)
    }

    // Créer client Supabase
    

    // Query de base - récupérer les rendez-vous
    let query = supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('salon_id', salonId)
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
      .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Filtre collaborateurs (préparé pour l'avenir)
    // if (collaboratorIdsParam) {
    //   const collaboratorIds = collaboratorIdsParam.split(',')
    //   query = query.in('collaborator_id', collaboratorIds)
    // }

    const { data: appointments, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des rendez-vous' },
        { status: 500 }
      )
    }

    // Récupérer les IDs de services uniques
    const serviceIds = [...new Set(appointments?.map(apt => apt.service_id).filter(Boolean))]
        
    // Récupérer les services correspondants par ID
    let servicesMap: Record<string, any> = {}
    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await supabaseAdmin
        .from('services')
        .select('id, name, duration_minutes, price_value')
        .in('id', serviceIds)

      if (!servicesError && services) {
        servicesMap = services.reduce((acc, service) => {
          acc[service.id] = service
          return acc
        }, {} as Record<string, any>)
      }
    }
    

    // Formater les données pour le front
    const formattedData = appointments?.map(rdv => {
      const service = rdv.service_id ? servicesMap[rdv.service_id] : null
      
      // FIX TIMEZONE: Parser avec timezone explicite (Europe/Brussels)
      // BDD stocke DATE + TIME sans timezone → parsing avec timezone du salon
      // Évite le décalage +1h en prod (Vercel UTC) vs local (Europe/Paris)
      const startDateTime = parseLocalDateTime(rdv.appointment_date, rdv.start_time)
      const duration = service?.duration_minutes || 60 // Durée par défaut 60min
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000)
      
      return {
        id: rdv.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: rdv.status, // Utiliser directement le statut de la BDD (pending/accepted/refused/cancelled)
        customer_name: rdv.customer_name,
        customer_email: rdv.customer_email || '',
        customer_phone: rdv.customer_phone,
        notes: rdv.message || '',
        created_at: rdv.created_at,
        service_name: service?.name || 'Service inconnu',
        service_duration: service?.duration_minutes || 60,
        service_price: service?.price_value || 0,
        collaborator_name: 'Non assigné',
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns'

/**
 * GET - Récupère les rendez-vous pour l'agenda admin
 * Query params:
 * - date: Date ISO (YYYY-MM-DD)
 * - viewMode: 'day' | 'week'
 * - collaboratorIds: string[] (optionnel)
 */
export async function GET(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
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
    const supabase = await createClient()

    // Query de base - récupérer les rendez-vous
    let query = supabase
      .from('appointments')
      .select('*')
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
      console.error('Erreur Supabase GET appointments:', error)
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
      const { data: services, error: servicesError } = await supabase
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
      
      // Construire start_time et end_time à partir de appointment_date + start_time
      const startDateTime = new Date(`${rdv.appointment_date}T${rdv.start_time}`)
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
    console.error('Erreur API GET appointments:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

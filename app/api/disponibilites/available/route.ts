export const dynamic = 'force-dynamic';
export const revalidate = 0; // ⚡ CRITICAL: Désactive totalement le cache ISR Next.js

import { NextResponse } from 'next/server'
import { addMinutes, parse, format } from 'date-fns'
import { PUBLIC_SALON_ID } from '@/lib/salonContext'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET - Récupère les horaires réellement disponibles pour un service donné
 * 
 * ⚠️ SINGLE SOURCE OF TRUTH :
 * Utilise la RPC get_available_slots_for_date() qui :
 * - Applique les statuts bloquants Step 4 : ('pending', 'accepted')
 * - Filtre automatiquement available_staff_count > 0
 * - Garantit la cohérence avec book_appointment_with_staff()
 * 
 * 🔒 UTILISE SERVICE ROLE (supabaseAdmin) :
 * - Les RPCs doivent lire les appointments pour calculer available_staff_count
 * - Le client anon est bloqué par RLS sur appointments
 * - Cohérent avec POST /api/rendezvous qui utilise aussi supabaseAdmin
 */
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('service_id')
    const date = searchParams.get('date')
    const dateDebut = searchParams.get('date_debut')
    const dateFin = searchParams.get('date_fin')
    const staffMemberId = searchParams.get('staff_member_id') // Step 6 : filtrer par coiffeur

    console.log('[GET /api/disponibilites/available] REQUEST:', {
      serviceId,
      date,
      dateDebut,
      dateFin,
      staffMemberId,
      timestamp: new Date().toISOString()
    })

    // 🔒 Validation: service_id obligatoire
    if (!serviceId || !serviceId.trim()) {
      return NextResponse.json(
        { success: false, error: 'service_id est obligatoire' },
        { status: 400 }
      )
    }

    // 🔒 Validation: serviceId doit être un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(serviceId)) {
      return NextResponse.json(
        { success: false, error: 'service_id invalide' },
        { status: 400 }
      )
    }

    // 🔒 Step 6 : Validation optionnelle staff_member_id
    if (staffMemberId && !uuidRegex.test(staffMemberId)) {
      return NextResponse.json(
        { success: false, error: 'staff_member_id invalide' },
        { status: 400 }
      )
    }

    // 🔒 SECURITY: salonId résolu uniquement depuis la config serveur
    // Ne JAMAIS accepter salon_id depuis query params (injection risk)
    const salonId = PUBLIC_SALON_ID

    // Récupérer le service avec sa durée
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes')
      .eq('id', serviceId)
      .eq('salon_id', salonId) // 🔒 Vérifier que le service appartient au salon
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: 'Service introuvable' },
        { status: 404 }
      )
    }

    // Récupérer la fréquence des créneaux depuis les settings (fallback)
    const { data: settings } = await supabase
      .from('salon_settings')
      .select('default_slot_frequency_minutes')
      .eq('salon_id', salonId)
      .single()

    const defaultFrequency = settings?.default_slot_frequency_minutes || 30

    // 🔒 Validation: plage de dates
    let dates: string[] = []
    if (date) {
      // Validation format date YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { success: false, error: 'Format date invalide (attendu: YYYY-MM-DD)' },
          { status: 400 }
        )
      }
      dates = [date]
    } else if (dateDebut && dateFin) {
      // Validation format dates
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDebut) || !/^\d{4}-\d{2}-\d{2}$/.test(dateFin)) {
        return NextResponse.json(
          { success: false, error: 'Format date_debut ou date_fin invalide (attendu: YYYY-MM-DD)' },
          { status: 400 }
        )
      }

      // Validation: dateDebut <= dateFin
      const start = new Date(dateDebut)
      const end = new Date(dateFin)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Date invalide' },
          { status: 400 }
        )
      }

      if (start > end) {
        return NextResponse.json(
          { success: false, error: 'date_debut doit être antérieure à date_fin' },
          { status: 400 }
        )
      }

      // Générer toutes les dates entre dateDebut et dateFin
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'date ou (date_debut + date_fin) requis' },
        { status: 400 }
      )
    }

    // Jours fermés (pour filtrage)
    const { data: closedDays } = await supabase
      .from('opening_days')
      .select('day_of_week')
      .eq('salon_id', salonId)
      .eq('is_open', false)

    const closedDaysSet = new Set((closedDays || []).map((d) => d.day_of_week))

    // Fermetures exceptionnelles
    const { data: exceptionalClosed } = await supabase
      .from('salon_exceptional_hours')
      .select('start_date, end_date')
      .eq('salon_id', salonId)
      .eq('type', 'closed')

    // Ouvertures exceptionnelles
    const { data: exceptionalOpen } = await supabase
      .from('salon_exceptional_hours')
      .select('start_date, end_date')
      .eq('salon_id', salonId)
      .eq('type', 'open')

    // Vérification rapide : au moins 1 staff actif
    const { count: activeStaffCount, error: staffError } = await supabase
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('salon_id', salonId)
      .eq('is_active', true)

    if (staffError || !activeStaffCount || activeStaffCount === 0) {
      return buildResponse({
        success: true,
        data: {
          service,
          slot_frequency_minutes: defaultFrequency,
          required_slots_count: Math.ceil(service.duration_minutes / defaultFrequency),
          available_slots: [],
          message: 'Aucun membre de l\'équipe disponible'
        },
      })
    }

    // ===================================================
    // SINGLE SOURCE OF TRUTH : get_available_slots_for_date()
    // ===================================================
    const now = new Date()
    const availableSlots: any[] = []

    for (const dateKey of dates) {
      // Vérifier si le jour est fermé
      const dayOfWeek = (new Date(dateKey).getDay() + 6) % 7

      // Check ouverture exceptionnelle
      const isExceptionallyOpen = (exceptionalOpen || []).some(
        (exc) => dateKey >= exc.start_date && dateKey <= exc.end_date
      )

      // Check fermeture exceptionnelle
      const isExceptionallyClosed = (exceptionalClosed || []).some(
        (exc) => dateKey >= exc.start_date && dateKey <= exc.end_date
      )

      // Si fermé (jour normal ou exception) et pas ouverture exceptionnelle, skip
      if (isExceptionallyClosed) continue
      if (!isExceptionallyOpen && closedDaysSet.has(dayOfWeek)) continue

      // ===================================================
      // APPEL RPC ATOMIQUE : 
      // - Si staff_member_id fourni : get_available_slots_for_staff()
      // - Sinon : get_available_slots_for_date() (tous les staff)
      // ===================================================
      
      let rpcSlots: Array<{ start_time: string; available_staff_count?: number; is_available?: boolean }> | null = null
      let rpcError: any = null

      if (staffMemberId) {
        // Step 6 : Créneaux pour UN staff spécifique
        const result = await supabase
          .rpc('get_available_slots_for_staff', {
            p_salon_id: salonId,
            p_staff_member_id: staffMemberId,
            p_date: dateKey,
            p_duration_minutes: service.duration_minutes
          })
        
        rpcSlots = result.data?.map((s: { start_time: string; is_available: boolean }) => ({
          start_time: s.start_time,
          available_staff_count: s.is_available ? 1 : 0
        })) || null
        rpcError = result.error
      } else {
        // Mode normal : tous les staff disponibles
        const result = await supabase
          .rpc('get_available_slots_for_date', {
            p_salon_id: salonId,
            p_date: dateKey,
            p_duration_minutes: service.duration_minutes
          })
        
        rpcSlots = result.data
        rpcError = result.error
      }

      if (rpcError) {
        console.error('[GET /api/disponibilites/available] RPC error:', rpcError, {
          date: dateKey,
          service_id: serviceId,
          salon_id: salonId
        })
        continue // Skip cette date en cas d'erreur
      }

      // Récupérer les time_slots pour cette date (pour les IDs)
      // ⚠️ Ne pas filtrer par is_available car la disponibilité est calculée par la RPC
      const { data: timeSlotsForDate } = await supabase
        .from('time_slots')
        .select('id, start_time')
        .eq('salon_id', salonId)
        .eq('slot_date', dateKey)
        .order('start_time', { ascending: true })

      const timeSlotMap = new Map(
        (timeSlotsForDate || []).map(s => [s.start_time, s.id])
      )

      // 🔍 Détecter la fréquence RÉELLE des créneaux pour cette date
      // En analysant l'écart entre les 2 premiers créneaux
      let slotFrequencyMinutes = defaultFrequency
      if (timeSlotsForDate && timeSlotsForDate.length >= 2) {
        const slot1 = parse(timeSlotsForDate[0].start_time, 'HH:mm:ss', new Date())
        const slot2 = parse(timeSlotsForDate[1].start_time, 'HH:mm:ss', new Date())
        const diffMs = slot2.getTime() - slot1.getTime()
        const detectedFreq = Math.round(diffMs / 60000) // Convertir ms en minutes
        if (detectedFreq > 0) {
          slotFrequencyMinutes = detectedFreq
        }
      }

      const requiredSlots = Math.ceil(service.duration_minutes / slotFrequencyMinutes)

      // Construire les slots disponibles avec required_slots
      for (const rpcSlot of (rpcSlots || [])) {
        const startTime = rpcSlot.start_time
        const staffCount = rpcSlot.available_staff_count

        // Double vérification : count > 0 (la RPC devrait déjà filtrer)
        if (staffCount <= 0) continue

        // Vérifier que le créneau n'est pas dans le passé
        const slotDateTime = new Date(`${dateKey}T${startTime}`)
        if (slotDateTime <= now) continue

        // Construire les required_slots (pour services multi-créneaux)
        const requiredSlotsList: Array<{ id: string; heure: string }> = []
        const baseTime = parse(startTime, 'HH:mm:ss', new Date())
        let allSlotsExist = true

        for (let j = 0; j < requiredSlots; j++) {
          const expectedTime = addMinutes(baseTime, j * slotFrequencyMinutes)
          const expectedHeure = format(expectedTime, 'HH:mm:ss')
          const slotId = timeSlotMap.get(expectedHeure)

          if (!slotId) {
            allSlotsExist = false
            break
          }

          requiredSlotsList.push({ id: slotId, heure: expectedHeure })
        }

        if (!allSlotsExist) continue

        availableSlots.push({
          date: dateKey,
          heure: startTime,
          available_staff_count: staffCount,
          required_slots: requiredSlotsList,
        })
      }
    }

    console.log('[GET /api/disponibilites/available] RESPONSE:', {
      total_slots: availableSlots.length,
      timestamp: new Date().toISOString()
    })

    return buildResponse({
      success: true,
      data: {
        service,
        slot_frequency_minutes: defaultFrequency, // Note: peut varier par jour
        required_slots_count: Math.ceil(service.duration_minutes / defaultFrequency),
        available_slots: availableSlots,
      },
    })
  } catch (error) {
    console.error('[GET /api/disponibilites/available] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * Construit une réponse avec headers anti-cache stricts
 */
function buildResponse(body: any): NextResponse {
  const response = NextResponse.json(body)
  
  // 🔥 Headers anti-cache stricts (CDN, proxy, navigateur)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.set('Surrogate-Control', 'no-store')
  response.headers.set('X-Accel-Expires', '0')
  
  return response
}

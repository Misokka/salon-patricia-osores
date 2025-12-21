import { SupabaseClient } from '@supabase/supabase-js'
import { addMinutes, parse, format } from 'date-fns'

/**
 * Résultat de la validation des créneaux
 */
interface ValidationResult {
  valid: boolean
  error?: string
  details?: {
    service_duration: number
    slot_frequency: number
    required_slots_count: number
    provided_slots_count: number
    slots_consecutive: boolean
  }
}

/**
 * Valide que les créneaux fournis correspondent exactement à la durée du service
 * 
 * Vérifications :
 * 1. Le service existe et a une durée valide
 * 2. Le nombre de créneaux correspond à Math.ceil(durée / fréquence)
 * 3. Les créneaux sont consécutifs (espacés exactement de `slotFrequency`)
 * 4. Tous les créneaux sont disponibles
 * 
 * @param supabase - Client Supabase
 * @param serviceId - ID du service réservé
 * @param slotIds - IDs des créneaux à réserver
 * @param salonId - ID du salon
 * @returns ValidationResult avec détails
 */
export async function validateAppointmentSlots(
  supabase: SupabaseClient,
  serviceId: string,
  slotIds: string[],
  salonId: string
): Promise<ValidationResult> {
  
  // 1. Récupérer le service et sa durée
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, name, duration_minutes')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    return {
      valid: false,
      error: 'Service introuvable'
    }
  }

  if (!service.duration_minutes || service.duration_minutes <= 0) {
    return {
      valid: false,
      error: `Le service "${service.name}" n'a pas de durée définie`
    }
  }

  // 2. Récupérer la fréquence des créneaux depuis les settings
  const { data: settings } = await supabase
    .from('salon_settings')
    .select('default_slot_frequency_minutes')
    .eq('salon_id', salonId)
    .single()

  const slotFrequencyMinutes = settings?.default_slot_frequency_minutes || 30

  // 3. Calculer le nombre de créneaux requis
  const requiredSlotsCount = Math.ceil(service.duration_minutes / slotFrequencyMinutes)

  // 4. Vérifier que le nombre de créneaux fournis est correct
  if (slotIds.length !== requiredSlotsCount) {
    return {
      valid: false,
      error: `Nombre de créneaux incorrect : ${slotIds.length} fourni(s), ${requiredSlotsCount} requis pour ${service.duration_minutes}min (fréquence: ${slotFrequencyMinutes}min)`,
      details: {
        service_duration: service.duration_minutes,
        slot_frequency: slotFrequencyMinutes,
        required_slots_count: requiredSlotsCount,
        provided_slots_count: slotIds.length,
        slots_consecutive: false
      }
    }
  }

  // 5. Récupérer les créneaux depuis la base
  const { data: slots, error: slotsError } = await supabase
    .from('time_slots')
    .select('id, slot_date, start_time, is_available')
    .in('id', slotIds)
    .order('start_time', { ascending: true })

  if (slotsError || !slots || slots.length === 0) {
    return {
      valid: false,
      error: 'Impossible de récupérer les créneaux'
    }
  }

  // 6. Vérifier que tous les créneaux existent
  if (slots.length !== slotIds.length) {
    return {
      valid: false,
      error: `${slotIds.length - slots.length} créneau(x) n'existe(nt) pas`
    }
  }

  // 7. Vérifier que tous les créneaux sont disponibles
  const unavailableSlots = slots.filter(s => !s.is_available)
  if (unavailableSlots.length > 0) {
    return {
      valid: false,
      error: `${unavailableSlots.length} créneau(x) n'est/ne sont plus disponible(s)`,
      details: {
        service_duration: service.duration_minutes,
        slot_frequency: slotFrequencyMinutes,
        required_slots_count: requiredSlotsCount,
        provided_slots_count: slotIds.length,
        slots_consecutive: false
      }
    }
  }

  // 8. Vérifier que tous les créneaux sont le même jour
  const uniqueDates = new Set(slots.map(s => s.slot_date))
  if (uniqueDates.size > 1) {
    return {
      valid: false,
      error: 'Les créneaux doivent être sur le même jour'
    }
  }

  // 9. Vérifier la consécutivité des créneaux
  const sortedSlots = [...slots].sort((a, b) => 
    a.start_time.localeCompare(b.start_time)
  )

  for (let i = 0; i < sortedSlots.length - 1; i++) {
    const currentSlot = sortedSlots[i]
    const nextSlot = sortedSlots[i + 1]

    const currentTime = parse(currentSlot.start_time, 'HH:mm:ss', new Date())
    const expectedNextTime = addMinutes(currentTime, slotFrequencyMinutes)
    const expectedNextTimeStr = format(expectedNextTime, 'HH:mm:ss')

    if (nextSlot.start_time !== expectedNextTimeStr) {
      return {
        valid: false,
        error: `Les créneaux ne sont pas consécutifs : écart détecté entre ${currentSlot.start_time} et ${nextSlot.start_time} (attendu: ${expectedNextTimeStr})`,
        details: {
          service_duration: service.duration_minutes,
          slot_frequency: slotFrequencyMinutes,
          required_slots_count: requiredSlotsCount,
          provided_slots_count: slotIds.length,
          slots_consecutive: false
        }
      }
    }
  }

  // ✅ Validation réussie
  return {
    valid: true,
    details: {
      service_duration: service.duration_minutes,
      slot_frequency: slotFrequencyMinutes,
      required_slots_count: requiredSlotsCount,
      provided_slots_count: slotIds.length,
      slots_consecutive: true
    }
  }
}

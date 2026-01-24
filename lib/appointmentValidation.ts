import { SupabaseClient } from '@supabase/supabase-js'
import { addMinutes, parse, format } from 'date-fns'

interface ValidationResult {
  valid: boolean
  error?: string
  details?: {
    service_duration: number
    total_slot_duration: number
    provided_slots_count: number
    slots_consecutive: boolean
    slot_times?: string[]
  }
}

export async function validateAppointmentSlots(
  supabase: SupabaseClient,
  serviceId: string,
  slotIds: string[],
  salonId: string
): Promise<ValidationResult> {
  
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

  if (slots.length !== slotIds.length) {
    return {
      valid: false,
      error: `${slotIds.length - slots.length} créneau(x) n'existe(nt) pas`
    }
  }

  const unavailableSlots = slots.filter(s => !s.is_available)
  if (unavailableSlots.length > 0) {
    return {
      valid: false,
      error: 'Certains créneaux sélectionnés ne sont plus disponibles'
    }
  }

  const uniqueDates = new Set(slots.map(s => s.slot_date))
  if (uniqueDates.size > 1) {
    return {
      valid: false,
      error: 'Les créneaux doivent être sur le même jour'
    }
  }

  const sortedSlots = [...slots].sort((a, b) => 
    a.start_time.localeCompare(b.start_time)
  )

  // Récupérer TOUS les créneaux du jour pour calculer les intervalles
  const slotDate = sortedSlots[0].slot_date
  const { data: allDaySlots, error: allDaySlotsError } = await supabase
    .from('time_slots')
    .select('id, start_time')
    .eq('slot_date', slotDate)
    .eq('salon_id', salonId)
    .order('start_time', { ascending: true })

  if (allDaySlotsError || !allDaySlots || allDaySlots.length === 0) {
    return {
      valid: false,
      error: 'Impossible de récupérer les créneaux de la journée'
    }
  }

  const slotTimes = sortedSlots.map(s => s.start_time)

  // Vérifier la consécutivité et calculer les durées
  let totalDuration = 0
  
  for (let i = 0; i < sortedSlots.length; i++) {
    const currentSlot = sortedSlots[i]
    
    // Trouver le prochain créneau dans la journée (pas forcément dans la sélection)
    const currentIndexInDay = allDaySlots.findIndex(s => s.id === currentSlot.id)
    const nextSlotInDay = allDaySlots[currentIndexInDay + 1]
    
    if (!nextSlotInDay) {
      // Dernier créneau de la journée - utiliser une durée par défaut
      // Calculer la durée moyenne des créneaux précédents ou 30min par défaut
      if (i > 0) {
        const avgDuration = totalDuration / i
        totalDuration += avgDuration
      } else {
        totalDuration += 30 // Défaut pour un seul créneau en fin de journée
      }
    } else {
      // Calculer la durée jusqu'au prochain créneau de la journée
      const currentTime = parse(currentSlot.start_time, 'HH:mm:ss', new Date())
      const nextTime = parse(nextSlotInDay.start_time, 'HH:mm:ss', new Date())
      const slotDuration = (nextTime.getTime() - currentTime.getTime()) / (1000 * 60)
      totalDuration += slotDuration
      
      // Vérifier la consécutivité si ce n'est pas le dernier créneau sélectionné
      if (i < sortedSlots.length - 1) {
        const nextSelectedSlot = sortedSlots[i + 1]
        // Le prochain créneau sélectionné doit être le prochain de la journée
        if (nextSlotInDay.id !== nextSelectedSlot.id) {
          const nextTimeStr = format(nextTime, 'HH:mm:ss')
          return {
            valid: false,
            error: `Les créneaux ne sont pas consécutifs : écart entre ${currentSlot.start_time} et ${nextSelectedSlot.start_time} (prochain créneau disponible: ${nextTimeStr})`,
            details: {
              service_duration: service.duration_minutes,
              total_slot_duration: 0,
              provided_slots_count: slotIds.length,
              slots_consecutive: false,
              slot_times: slotTimes
            }
          }
        }
      }
    }
  }

  // Vérifier que la durée totale couvre au moins la durée du service
  if (totalDuration < service.duration_minutes) {
    return {
      valid: false,
      error: `Durée insuffisante : ${totalDuration}min couvert par les créneaux, ${service.duration_minutes}min requis`,
      details: {
        service_duration: service.duration_minutes,
        total_slot_duration: totalDuration,
        provided_slots_count: slotIds.length,
        slots_consecutive: true,
        slot_times: slotTimes
      }
    }
  }

  return {
    valid: true,
    details: {
      service_duration: service.duration_minutes,
      total_slot_duration: totalDuration,
      provided_slots_count: slotIds.length,
      slots_consecutive: true,
      slot_times: slotTimes
    }
  }
}

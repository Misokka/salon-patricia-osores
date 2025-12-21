import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../lib/salonContext'
import { addDays, addMinutes, format, parse, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * GET - Récupère tous les horaires exceptionnels
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const salonId = getDefaultSalonId()
    const { data: exceptionals, error } = await supabase
      .from('exceptional_periods')
      .select(`
        *,
        exceptional_time_ranges (*)
      `)
      .eq('salon_id', salonId)
      .order('start_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: exceptionals || [],
    })
  } catch (error) {
    console.error('Erreur GET horaires exceptionnels:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST - Crée un horaire exceptionnel
 */
export async function POST(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const body = await request.json()
    const { start_date, end_date, type, reason, time_ranges, confirm_cancel_appointments } = body

    if (!start_date || !end_date || !type) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    const salonId = getDefaultSalonId()

    // Si c'est une fermeture, vérifier s'il y a des RDV confirmés (statut 'accepted')
    if (type === 'closed' && !confirm_cancel_appointments) {
      console.log('🔍 Vérification RDV existants pour période:', { start_date, end_date })
      
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select(`
          id, 
          customer_name, 
          customer_email, 
          service_id, 
          appointment_date, 
          start_time, 
          status,
          services!inner(name)
        `)
        .eq('salon_id', salonId)
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date)
        .eq('status', 'accepted')

      console.log('📋 RDV trouvés:', existingAppointments)

      if (existingAppointments && existingAppointments.length > 0) {
        // Formater les RDV pour la modale frontend
        const formattedAppointments = existingAppointments.map((rdv: any) => ({
          id: rdv.id,
          nom: rdv.customer_name,
          email: rdv.customer_email,
          service: rdv.services?.name || 'Service',
          date: rdv.appointment_date,
          heure: rdv.start_time,
        }))

        console.log('⚠️ Retour 409 avec', formattedAppointments.length, 'RDV')
        return NextResponse.json(
          {
            success: false,
            requiresConfirmation: true,
            appointments: formattedAppointments,
            message: `${formattedAppointments.length} rendez-vous confirmé(s) trouvé(s) sur cette période`,
          },
          { status: 409 }
        )
      }
      
      console.log('✅ Aucun RDV confirmé trouvé, création directe')
    }
    
    // Créer l'horaire exceptionnel
    const { data: newExceptionalPeriod, error: insertError } = await supabase
      .from('exceptional_periods')
      .insert({
        salon_id: salonId,
        start_date,
        end_date,
        type,
        reason,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Si fermeture exceptionnelle, annuler les RDV et supprimer les créneaux disponibles
    if (type === 'closed') {
      // 1. Annuler les RDV confirmés et envoyer les emails
      if (confirm_cancel_appointments) {
        console.log('🔴 Annulation des RDV confirmée par admin')
        
        const { data: appointmentsToCancel } = await supabase
          .from('appointments')
          .select(`
            *,
            services!inner(name)
          `)
          .eq('salon_id', salonId)
          .gte('appointment_date', start_date)
          .lte('appointment_date', end_date)
          .eq('status', 'accepted')

        console.log('📋 RDV à annuler:', appointmentsToCancel?.length || 0)

        if (appointmentsToCancel && appointmentsToCancel.length > 0) {
          // Annuler les RDV
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .in('id', appointmentsToCancel.map(rdv => rdv.id))

          if (updateError) {
            console.error('❌ Erreur mise à jour statut RDV:', updateError)
          } else {
            console.log('✅ Statut RDV mis à jour en "cancelled"')
          }

          // Envoyer les emails d'annulation
          const { sendExceptionalClosureEmail } = await import('../../../../lib/emailService')
          
          let emailsSent = 0
          for (const rdv of appointmentsToCancel) {
            if (rdv.customer_email) {
              try {
                const serviceName = (rdv as any).services?.name || 'Service'
                const formattedDate = format(parseISO(rdv.appointment_date), 'yyyy-MM-dd')
                const formattedTime = rdv.start_time.substring(0, 5) // HH:mm

                console.log('📧 Envoi email à:', rdv.customer_email, 'pour RDV du', formattedDate)

                await sendExceptionalClosureEmail({
                  nom: rdv.customer_name,
                  email: rdv.customer_email,
                  service: serviceName,
                  date: formattedDate,
                  heure: formattedTime,
                  reason: reason || 'Fermeture exceptionnelle du salon'
                })
                
                emailsSent++
                console.log('✅ Email envoyé')
              } catch (emailError) {
                console.error('❌ Erreur envoi email annulation:', emailError)
              }
            } else {
              console.log('⚠️ RDV sans email:', rdv.customer_name)
            }
          }

          console.log(`✅ ${appointmentsToCancel.length} rendez-vous annulé(s), ${emailsSent} email(s) envoyé(s)`)
        }
      }

      // 2. Récupérer tous les créneaux de la période
      const { data: slotsToCheck, error: fetchError } = await supabase
        .from('time_slots')
        .select('id, slot_date, start_time, is_available')
        .gte('slot_date', start_date)
        .lte('slot_date', end_date)
        .eq('salon_id', salonId)

      if (fetchError) {
        console.error('Erreur récupération créneaux:', fetchError)
      } else if (slotsToCheck && slotsToCheck.length > 0) {
        // Supprimer UNIQUEMENT les créneaux disponibles (non réservés)
        const availableSlotIds = slotsToCheck
          .filter(slot => slot.is_available === true)
          .map(slot => slot.id)

        if (availableSlotIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('time_slots')
            .delete()
            .in('id', availableSlotIds)

          if (deleteError) {
            console.error('Erreur suppression créneaux disponibles:', deleteError)
          } else {
            console.log(`✅ ${availableSlotIds.length} créneau(x) disponible(s) supprimé(s)`)
          }
        }
      }
    }

    // Si ouverture exceptionnelle, ajouter les plages horaires ET générer les créneaux
    if (type === 'open' && time_ranges && time_ranges.length > 0) {
      console.log('🔵 Création ouverture exceptionnelle:', {
        start_date,
        end_date,
        time_ranges_count: time_ranges.length,
      })

      const ranges = time_ranges.map((range: any) => ({
        exceptional_period_id: newExceptionalPeriod.id,
        day_of_week: range.day_of_week,
        start_time: range.start_time,
        end_time: range.end_time,
        slot_frequency_minutes: range.slot_frequency_minutes,
      }))

      const { error: rangesError } = await supabase
        .from('exceptional_time_ranges')
        .insert(ranges)

      if (rangesError) throw rangesError

      // Générer les créneaux pour chaque plage sur TOUS les jours de la période
      let totalGeneratedSlots = 0

      for (const range of time_ranges) {
        console.log('🔵 Génération pour plage:', {
          start_time: range.start_time,
          end_time: range.end_time,
          frequency: range.slot_frequency_minutes,
        })

        const count = await generateExceptionalSlots(
          supabase,
          salonId,
          start_date,
          end_date,
          range.start_time,
          range.end_time,
          range.slot_frequency_minutes
        )

        console.log(`✅ Créneaux générés pour cette plage: ${count}`)
        totalGeneratedSlots += count
      }

      const message = totalGeneratedSlots > 0
        ? `Horaire exceptionnel créé avec ${totalGeneratedSlots} créneau(x) généré(s)`
        : `Ouverture exceptionnelle créée, mais aucun créneau généré : tous les créneaux existent déjà`

      return NextResponse.json({
        success: true,
        message,
        data: newExceptionalPeriod,
        warning: totalGeneratedSlots === 0 ? 'no_slots_generated' : null,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Horaire exceptionnel créé',
      data: newExceptionalPeriod,
    })
  } catch (error) {
    console.error('Erreur POST horaires exceptionnels:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * Génère les créneaux pour un jour exceptionnel
 * Génère des créneaux pour TOUS les jours de la période (pas de filtre day_of_week)
 */
async function generateExceptionalSlots(
  supabase: any,
  salonId: string,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  slotFrequency: number
): Promise<number> {
  const slots: any[] = []
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Parcourir TOUS les jours de la période exceptionnelle
  let currentDate = start
  while (currentDate <= end) {
    const currentDateMidnight = new Date(currentDate)
    currentDateMidnight.setHours(0, 0, 0, 0)
    
    if (currentDateMidnight < now) {
      currentDate = addDays(currentDate, 1)
      continue
    }

    const dateStr = format(currentDate, 'yyyy-MM-dd')

    // Normaliser le format des heures
    const normalizedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime
    const normalizedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime
    
    const startTimeParsed = parse(normalizedStartTime, 'HH:mm:ss', currentDate)
    const endTimeParsed = parse(normalizedEndTime, 'HH:mm:ss', currentDate)

    let slotTime = startTimeParsed
    while (slotTime < endTimeParsed) {
      const timeStr = format(slotTime, 'HH:mm:ss')

      slots.push({
        salon_id: salonId,
        slot_date: dateStr,
        start_time: timeStr,
        is_available: true,
      })

      slotTime = addMinutes(slotTime, slotFrequency)
    }

    currentDate = addDays(currentDate, 1)
  }

  if (slots.length === 0) {
    console.log('⚠️ Aucun créneau généré entre', startDate, 'et', endDate)
    return 0
  }

  // Vérifier les créneaux existants pour éviter les doublons
  const { data: existing } = await supabase
    .from('time_slots')
    .select('slot_date, start_time')
    .eq('salon_id', salonId)
    .gte('slot_date', format(start, 'yyyy-MM-dd'))
    .lte('slot_date', format(end, 'yyyy-MM-dd'))

  const existingSet = new Set(
    (existing || []).map((e: any) => `${e.slot_date}_${e.start_time}`)
  )

  const uniqueSlots = slots.filter(
    (slot) => !existingSet.has(`${slot.slot_date}_${slot.start_time}`)
  )

  const duplicateCount = slots.length - uniqueSlots.length

  if (uniqueSlots.length > 0) {
    const { error } = await supabase.from('time_slots').insert(uniqueSlots)
    if (error) {
      console.error('❌ Erreur insertion créneaux exceptionnels:', error)
      return 0
    }
    console.log('✅ Créneaux exceptionnels générés:', uniqueSlots.length)
    if (duplicateCount > 0) {
      console.log('ℹ️ Créneaux déjà existants ignorés:', duplicateCount)
    }
    return uniqueSlots.length
  }

  console.log('ℹ️ Tous les créneaux existent déjà (', slots.length, 'doublons)')
  return 0
}

/**
 * DELETE - Supprime un horaire exceptionnel
 * Si c'était une fermeture, restaurer les créneaux normaux pour cette période
 */
export async function DELETE(request: Request) {
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 })
    }

    const salonId = getDefaultSalonId()

    // Récupérer l'horaire exceptionnel avant de le supprimer
    const { data: exceptional, error: fetchError } = await supabase
      .from('exceptional_periods')
      .select('*')
      .eq('id', id)
      .eq('salon_id', salonId)
      .single()

    if (fetchError) throw fetchError

    // Supprimer l'horaire exceptionnel (cascade delete géré par la base pour time_ranges)
    const { error: deleteError } = await supabase
      .from('exceptional_periods')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // Si c'était une fermeture, restaurer les créneaux normaux
    let restoredSlots = 0
    if (exceptional.type === 'closed') {
      // Récupérer les plages horaires standards pour ces dates
      const { data: timeRanges, error: rangesError } = await supabase
        .from('opening_time_ranges')
        .select('*')
        .eq('salon_id', salonId)

      if (rangesError) throw rangesError

      if (timeRanges && timeRanges.length > 0) {
        const startDate = parseISO(exceptional.start_date)
        const endDate = parseISO(exceptional.end_date)

        // Pour chaque plage horaire, générer les créneaux sur la période
        for (const range of timeRanges) {
          const count = await generateSlotsForRange(
            supabase,
            salonId,
            startDate,
            endDate,
            range.day_of_week,
            range.start_time,
            range.end_time,
            range.slot_frequency_minutes
          )

          restoredSlots += count
        }
      }

      return NextResponse.json({
        success: true,
        message: `Horaire exceptionnel supprimé et ${restoredSlots} créneau(x) restauré(s)`,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Horaire exceptionnel supprimé',
    })
  } catch (error) {
    console.error('Erreur DELETE horaires exceptionnels:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * Génère les créneaux pour une plage horaire sur une période donnée
 * IMPORTANT: day_of_week dans notre système: 0=Lundi, 1=Mardi, ..., 6=Dimanche
 */
async function generateSlotsForRange(
  supabase: any,
  salonId: string,
  startDate: Date,
  endDate: Date,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  slotFrequency: number
): Promise<number> {
  const slots: any[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Parcourir chaque jour de la période
  let currentDate = startDate
  while (currentDate <= endDate) {
    // Convertir getDay() vers notre système
    const jsDayOfWeek = currentDate.getDay()
    const ourDayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1

    const currentDateMidnight = new Date(currentDate)
    currentDateMidnight.setHours(0, 0, 0, 0)

    // Si le jour correspond à day_of_week ET n'est pas passé
    if (ourDayOfWeek === dayOfWeek && currentDateMidnight >= now) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')

      // Vérifier si des créneaux existent déjà pour ce jour
      const { data: existingSlots } = await supabase
        .from('time_slots')
        .select('start_time')
        .eq('salon_id', salonId)
        .eq('slot_date', dateStr)

      const existingTimes = new Set(
        (existingSlots || []).map((s: any) => s.start_time)
      )

      // Générer créneaux pour ce jour
      const startTimeParsed = parse(startTime, 'HH:mm:ss', currentDate)
      const endTimeParsed = parse(endTime, 'HH:mm:ss', currentDate)

      let slotTime = startTimeParsed
      while (slotTime < endTimeParsed) {
        const timeStr = format(slotTime, 'HH:mm:ss')

        // Ajouter seulement si le créneau n'existe pas déjà
        if (!existingTimes.has(timeStr)) {
          slots.push({
            salon_id: salonId,
            slot_date: dateStr,
            start_time: timeStr,
            is_available: true,
          })
        }

        slotTime = addMinutes(slotTime, slotFrequency)
      }
    }

    currentDate = addDays(currentDate, 1)
  }

  if (slots.length > 0) {
    const { error } = await supabase.from('time_slots').insert(slots)
    if (error) {
      console.error('Erreur restauration créneaux:', error)
      return 0
    }
    return slots.length
  }

  return 0
}

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDefaultSalonId } from '../../../lib/salonContext'

// Initialiser le client Supabase
function getSupabase() {
  return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
}

// GET : Récupérer les disponibilités
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const disponibleUniquement = searchParams.get('disponibleUniquement') === 'true'

    let query = getSupabase()
      .from('time_slots')
      .select('*')
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Filtrer par période si spécifié
    if (dateDebut) {
      query = query.gte('slot_date', dateDebut)
    }
    if (dateFin) {
      query = query.lte('slot_date', dateFin)
    }

    // Filtrer uniquement les créneaux disponibles si demandé
    if (disponibleUniquement) {
      query = query.eq('is_available', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des disponibilités' },
        { status: 500 }
      )
    }

    const salonId = getDefaultSalonId()

    // Récupérer les jours fermés
    const { data: closedDays } = await getSupabase()
      .from('opening_days')
      .select('day_of_week')
      .eq('salon_id', salonId)
      .eq('is_open', false)

    const closedDaysSet = new Set((closedDays || []).map((d) => d.day_of_week))

    // Récupérer les fermetures exceptionnelles
    const { data: exceptionalClosed } = await getSupabase()
      .from('salon_exceptional_hours')
      .select('start_date, end_date')
      .eq('salon_id', salonId)
      .eq('type', 'closed')

    // Récupérer les ouvertures exceptionnelles
    const { data: exceptionalOpen } = await getSupabase()
      .from('salon_exceptional_hours')
      .select('start_date, end_date')
      .eq('salon_id', salonId)
      .eq('type', 'open')

    // Filtrer les créneaux
    const now = new Date()
    const filteredData = (data || []).filter((dispo) => {
      // Exclure créneaux passés
      const dispoDateTime = new Date(`${dispo.slot_date}T${dispo.start_time}`)
      if (dispoDateTime <= now) return false

      // Vérifier si c'est une ouverture exceptionnelle
      const isExceptionallyOpen = (exceptionalOpen || []).some((exc) => {
        return dispo.slot_date >= exc.start_date && dispo.slot_date <= exc.end_date
      })

      // Si ouverture exceptionnelle, ne pas appliquer le filtre des jours fermés
      if (!isExceptionallyOpen) {
        // Exclure jours fermés normalement
        const dispoDate = new Date(dispo.slot_date)
        const dayOfWeek = (dispoDate.getDay() + 6) % 7 // Convertir dimanche=0 en dimanche=6
        if (closedDaysSet.has(dayOfWeek)) return false
      }

      // Exclure fermetures exceptionnelles
      const isExceptionallyClosed = (exceptionalClosed || []).some((exc) => {
        return dispo.slot_date >= exc.start_date && dispo.slot_date <= exc.end_date
      })
      if (isExceptionallyClosed) return false

      return true
    })

    // Transformer les données pour le format attendu par le frontend
    const transformedData = filteredData.map(slot => ({
      id: slot.id,
      date: slot.slot_date,
      heure: slot.start_time,
      est_disponible: slot.is_available
    }))

    return NextResponse.json(transformedData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST : Ajouter une nouvelle disponibilité
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, heure, est_disponible = true } = body

    // Validation des données
    if (!date || !heure) {
      return NextResponse.json(
        { error: 'Date et heure sont obligatoires' },
        { status: 400 }
      )
    }

    // Vérifier si le créneau existe déjà
    const { data: existing } = await getSupabase()
      .from('time_slots')
      .select('id')
      .eq('slot_date', date)
      .eq('start_time', heure)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Ce créneau existe déjà' },
        { status: 409 }
      )
    }

    // Insérer le nouveau créneau
    const { data, error } = await getSupabase()
      .from('time_slots')
      .insert([{ slot_date: date, start_time: heure, is_available: est_disponible }])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout de la disponibilité' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// DELETE : Supprimer une disponibilité
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID est obligatoire' },
        { status: 400 }
      )
    }

    const { error } = await getSupabase()
      .from('time_slots')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la disponibilité' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Disponibilité supprimée avec succès' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// PATCH : Mettre à jour une disponibilité (marquer comme réservée)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, est_disponible } = body

    if (!id || est_disponible === undefined) {
      return NextResponse.json(
        { error: 'ID et est_disponible sont obligatoires' },
        { status: 400 }
      )
    }

    const { data, error } = await getSupabase()
      .from('time_slots')
      .update({ is_available: est_disponible })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la disponibilité' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

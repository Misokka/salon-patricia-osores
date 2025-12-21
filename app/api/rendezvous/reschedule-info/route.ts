import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rdvId = searchParams.get('id')

    if (!rdvId) {
      return NextResponse.json(
        { success: false, error: 'ID de rendez-vous manquant' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Récupérer le rendez-vous
    const { data: rdv, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', rdvId)
      .single()

    if (error || !rdv) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que le RDV est bien en attente de validation
    if (rdv.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Ce rendez-vous n\'est plus en attente de modification' },
        { status: 400 }
      )
    }

    // Vérifier qu'il y a bien des propositions
    if (!rdv.proposed_date || !rdv.proposed_start_time) {
      return NextResponse.json(
        { success: false, error: 'Aucune proposition de modification disponible' },
        { status: 400 }
      )
    }

    // Récupérer le nom du service
    const { data: serviceData } = await supabase
      .from('services')
      .select('name')
      .eq('id', rdv.service_id)
      .single()

    const serviceName = serviceData?.name || 'Service'

    // Formater les dates pour l'affichage
    const oldDate = format(parseISO(rdv.appointment_date), 'EEEE d MMMM yyyy', { locale: fr })
    const newDate = format(parseISO(rdv.proposed_date), 'EEEE d MMMM yyyy', { locale: fr })

    return NextResponse.json({
      success: true,
      data: {
        id: rdv.id,
        nom: rdv.customer_name,
        service: serviceName,
        oldDate,
        oldTime: rdv.start_time,
        newDate,
        newTime: rdv.proposed_start_time,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

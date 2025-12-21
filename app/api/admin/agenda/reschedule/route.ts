export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/verifyAdmin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendRescheduleEmail } from '@/lib/emailService'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * PATCH - Déplace un rendez-vous (modifie date/heure) et envoie email au client
 */
export async function PATCH(request: Request) {
  try {
    // Vérification admin
    const authResult = await verifyAdminAuth()
    if (authResult.error) {
      return authResult.error
    }

    const { id, newDate, newTime } = await request.json()

    if (!id || !newDate || !newTime) {
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    

    // Récupérer le rendez-vous actuel
    const { data: rdv, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !rdv) {
      return NextResponse.json(
        { success: false, error: 'Rendez-vous introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que le créneau est disponible
    const { data: existingRdv, error: checkError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('appointment_date', newDate)
      .eq('start_time', newTime)
      .in('status', ['accepted', 'pending'])
      .neq('id', id)
      .maybeSingle()

    if (checkError) {
    }

    if (existingRdv) {
      return NextResponse.json(
        { success: false, error: 'Ce créneau est déjà réservé' },
        { status: 400 }
      )
    }

    // Stocker la proposition de modification dans le RDV (nouveau champs)
    // Le RDV reste inchangé jusqu'à validation client
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        proposed_date: newDate,
        proposed_start_time: newTime,
        status: 'pending', // Passe en attente de validation client
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    // Envoyer l'email au client si email disponible
    if (rdv.customer_email) {
      try {
        // Récupérer le nom du service
        const { data: serviceData } = await supabaseAdmin
          .from('services')
          .select('name')
          .eq('id', rdv.service_id)
          .single()

        const serviceName = serviceData?.name || 'Service'

        // Formater les dates en français
        const oldDateObj = new Date(`${rdv.appointment_date}T00:00:00`)
        const newDateObj = new Date(`${newDate}T00:00:00`)
        
        const oldDateFormatted = format(oldDateObj, 'yyyy-MM-dd')
        const newDateFormatted = format(newDateObj, 'yyyy-MM-dd')

        await sendRescheduleEmail({
          nom: rdv.customer_name,
          email: rdv.customer_email,
          service: serviceName,
          oldDate: oldDateFormatted,
          oldTime: rdv.start_time,
          newDate: newDateFormatted,
          newTime: newTime,
          rdvId: id,
        })
      } catch (emailError) {
        // Ne pas bloquer la réponse si l'email échoue
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rendez-vous déplacé avec succès',
      data: updated,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

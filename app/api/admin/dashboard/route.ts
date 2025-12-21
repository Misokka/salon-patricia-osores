import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase/admin'
import { verifyAdminAuth } from '../../../../lib/auth/verifyAdmin'
import { getDefaultSalonId } from '../../../../lib/salonContext'

export async function GET() {
  // Vérifier l'authentification admin
  const { user, error: authError } = await verifyAdminAuth()
  if (authError) return authError

  try {
    const salonId = getDefaultSalonId()
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // 1. Récupérer le prochain rendez-vous
    const { data: prochainRdv, error: rdvError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('salon_id', salonId)
      .eq('status', 'pending')
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .single()

    // 2. Compter les rendez-vous en attente
    const { count: rdvEnAttente, error: countError } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salonId)
      .eq('status', 'pending')

    // 3. Compter les disponibilités libres cette semaine
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekStr = nextWeek.toISOString().split('T')[0]

    const { count: disponibilitesLibres, error: dispoError } = await supabaseAdmin
      .from('time_slots')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salonId)
      .eq('is_available', true)
      .gte('slot_date', today)
      .lte('slot_date', nextWeekStr)

    // 4. Compter les rendez-vous confirmés à venir
    const { count: rdvAVenir, error: rdvAVenirError } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salonId)
      .in('status', ['pending', 'accepted'])
      .gte('appointment_date', today)

    // 5. Récupérer les statistiques du mois en cours
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]

    const { count: rdvCeMois, error: rdvMoisError } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salonId)
      .gte('appointment_date', firstDayOfMonth)
      .lte('appointment_date', lastDayOfMonth)

    if (rdvError && rdvError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, c'est ok
      console.error('Erreur lors de la récupération du prochain RDV:', rdvError)
    }

    return NextResponse.json({
      success: true,
      data: {
        prochainRendezvous: prochainRdv || null,
        statistiques: {
          rendezvousEnAttente: rdvEnAttente || 0,
          disponibilitesLibresSemaine: disponibilitesLibres || 0,
          rendezvousAVenir: rdvAVenir || 0,
          rendezvousCeMois: rdvCeMois || 0,
        },
      },
    })
  } catch (error) {
    console.error('Erreur API dashboard:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des données du tableau de bord',
      },
      { status: 500 }
    )
  }
}

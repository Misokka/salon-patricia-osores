'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  FaCalendarCheck,
  FaClock,
  FaCalendarAlt,
  FaCalendarDay,
  FaQuestionCircle,
} from 'react-icons/fa'
import { salonConfig } from '@/config/salon.config'

import KPICard from '@/app/components/admin/KPICard'
import NextAppointmentCard from '@/app/components/admin/NextAppointmentCard'
import QuickActionCard from '@/app/components/admin/QuickActionCard'
import RecentRequestsCard from '@/app/components/admin/RecentRequestsCard'

/* ----------------------------------------
   Types
---------------------------------------- */

import type { Appointment } from '@/types/appointment'


interface DashboardStats {
  pendingCount: number
  upcomingCount: number
  todayCount: number
  weekCount: number
  nextAppointment: Appointment | null
  latestRequest: Appointment | null
}

/* ----------------------------------------
   Page
---------------------------------------- */

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingCount: 0,
    upcomingCount: 0,
    todayCount: 0,
    weekCount: 0,
    nextAppointment: null,
    latestRequest: null,
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  /* ----------------------------------------
     Data loader
  ---------------------------------------- */

  const loadDashboard = async () => {
    try {
      setLoading(true)

      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const nowTime = today.toTimeString().slice(0, 5)

      // Semaine courante (lundi → dimanche)
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      const weekStart = monday.toISOString().split('T')[0]
      const weekEnd = sunday.toISOString().split('T')[0]

      const { data: response } = await axios.get('/api/admin/rendezvous')

      if (!response.success) {
        console.error('Erreur API dashboard')
        return
      }

      const appointments: Appointment[] = response.data || []

      /* -----------------------------
         KPIs
      ----------------------------- */

      const pendingAppointments = appointments.filter(
        rdv => rdv.status === 'pending'
      )

      const pendingCount = pendingAppointments.length

      const upcomingCount = appointments.filter(
        rdv =>
          rdv.status === 'accepted' &&
          rdv.appointment_date >= todayStr
      ).length

      const todayCount = appointments.filter(
        rdv =>
          (rdv.status === 'pending' || rdv.status === 'accepted') &&
          rdv.appointment_date === todayStr
      ).length

      const weekCount = appointments.filter(
        rdv =>
          (rdv.status === 'pending' || rdv.status === 'accepted') &&
          rdv.appointment_date >= weekStart &&
          rdv.appointment_date <= weekEnd
      ).length

      /* -----------------------------
         Prochain RDV
      ----------------------------- */

      const nextAppointment =
        appointments
          .filter(rdv => rdv.status === 'pending' || rdv.status === 'accepted')
          .sort((a, b) =>
            `${a.appointment_date}T${a.start_time}`.localeCompare(
              `${b.appointment_date}T${b.start_time}`
            )
          )
          .find(rdv => {
            if (rdv.appointment_date > todayStr) return true
            if (rdv.appointment_date === todayStr)
              return rdv.start_time >= nowTime
            return false
          }) ?? null

      /* -----------------------------
         Dernière demande (1 seule)
      ----------------------------- */

      const latestRequest =
        pendingAppointments
          .sort((a, b) =>
            `${a.appointment_date}T${a.start_time}`.localeCompare(
              `${b.appointment_date}T${b.start_time}`
            )
          )[0] ?? null

      setStats({
        pendingCount,
        upcomingCount,
        todayCount,
        weekCount,
        nextAppointment,
        latestRequest,
      })
    } catch (error) {
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  /* ----------------------------------------
     Loading
  ---------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  /* ----------------------------------------
     Render
  ---------------------------------------- */

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bonjour {salonConfig.admin.name}
        </h1>
        <p className="text-gray-600">
          Voici un aperçu de l’activité de votre salon aujourd’hui.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Demandes en attente"
          value={stats.pendingCount}
          subtitle={stats.pendingCount > 0 ? 'à confirmer' : 'Aucune'}
          icon={FaClock}
          variant={stats.pendingCount > 0 ? 'warning' : 'default'}
        />

        <KPICard
          title="Rendez-vous à venir"
          value={stats.upcomingCount}
          subtitle={stats.upcomingCount > 0 ? 'confirmés' : 'Aucun'}
          icon={FaCalendarCheck}
          variant="success"
        />

        <KPICard
          title="Aujourd’hui"
          value={stats.todayCount}
          subtitle="rendez-vous"
          icon={FaCalendarDay}
          variant="primary"
        />

        <KPICard
          title="Cette semaine"
          value={stats.weekCount}
          subtitle="rendez-vous"
          icon={FaCalendarAlt}
        />
      </div>

      {/* Dernière demande */}
      <div className="mb-8">
        <RecentRequestsCard
          request={stats.latestRequest}
          onActionComplete={loadDashboard}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <NextAppointmentCard appointment={stats.nextAppointment} />
        </div>

        <div className="space-y-4">
          <QuickActionCard
            title="Disponibilités"
            description="Gérer vos horaires d’ouverture"
            icon={FaClock}
            href="/admin/disponibilites"
            variant="primary"
          />

          <QuickActionCard
            title="Tous les rendez-vous"
            description="Voir l’agenda complet"
            icon={FaCalendarAlt}
            href="/admin/rendezvous"
          />
        </div>
      </div>

      {/* Help */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
          <FaQuestionCircle />
          <h3 className="font-medium">Besoin d’aide ?</h3>
        </div>
        <p className="text-sm text-gray-500">
          Consultez le guide d’utilisation ou contactez le support technique.
        </p>
      </div>
    </div>
  )
}

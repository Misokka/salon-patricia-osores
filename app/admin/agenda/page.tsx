'use client'

import { useState, useEffect } from 'react'
import { addDays, subDays, addWeeks, subWeeks, startOfToday, format } from 'date-fns'
import axios from 'axios'
import AgendaHeader, { ViewMode, TimeInterval } from '@/app/components/admin/agenda/AgendaHeader'
import MiniCalendar from '@/app/components/admin/agenda/MiniCalendar'
import CollaboratorFilter, { Collaborator } from '@/app/components/admin/agenda/CollaboratorFilter'
import TimeGrid from '@/app/components/admin/agenda/TimeGrid'
import AppointmentDetailModal from '@/app/components/admin/agenda/AppointmentDetailModal'
import EditAppointmentModal from '@/app/components/admin/agenda/EditAppointmentModal'
import type { Appointment } from '@/types/appointment'

export default function AgendaPage() {
  // États principaux
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(15)
  
  // Initialiser currentDate et timeInterval côté client uniquement
  useEffect(() => {
    setCurrentDate(startOfToday())
    
    // Récupérer l'intervalle depuis localStorage
    const saved = localStorage.getItem('agendaTimeInterval')
    if (saved) {
      setTimeInterval(Number(saved) as TimeInterval)
    }
  }, [])
  
  // Données
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { id: '1', name: 'Principal' }, // Collaborateur par défaut
  ])
  const [visibleCollaboratorIds, setVisibleCollaboratorIds] = useState<string[]>(['1'])
  
  // UI States
  const [loading, setLoading] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Charger les rendez-vous
  useEffect(() => {
    fetchAppointments()
  }, [currentDate, viewMode, visibleCollaboratorIds])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const dateParam = format(currentDate, 'yyyy-MM-dd')
      const collaboratorIdsParam = visibleCollaboratorIds.join(',')
      
      const response = await axios.get('/api/admin/agenda/appointments', {
        params: {
          date: dateParam,
          viewMode,
          collaboratorIds: collaboratorIdsParam,
        }
      })

      if (response.data.success) {
        setAppointments(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement rendez-vous:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  // Navigation
  const handlePrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(subDays(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const handleNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const handleToday = () => {
    setCurrentDate(startOfToday())
  }

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date)
    if (viewMode === 'week') {
      setViewMode('day') // Passer en vue jour lors de la sélection d'une date
    }
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDetailModal(true)
  }

  const handleTimeIntervalChange = (interval: TimeInterval) => {
    setTimeInterval(interval)
    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('agendaTimeInterval', interval.toString())
    }
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDetailModal(false)
    setShowEditModal(true)
  }

  const handleCancelAppointment = async (id: string) => {
    try {
      const response = await axios.patch('/api/admin/rendezvous', {
        id,
        status: 'cancelled',
      })

      if (response.data.success) {
        setSuccessMessage('Rendez-vous annulé. Les créneaux ont été libérés.')
        setTimeout(() => setSuccessMessage(null), 5000)
        await fetchAppointments()
      } else {
        throw new Error(response.data.error || 'Erreur lors de l\'annulation')
      }
    } catch (error: any) {
      setSuccessMessage(null)
      alert(error.response?.data?.error || error.message || 'Erreur lors de l\'annulation')
    }
  }

  const handleAcceptAppointment = async (id: string) => {
    try {
      await axios.patch('/api/admin/rendezvous', {
        id,
        status: 'accepted',
      })
      setSuccessMessage('Rendez-vous accepté')
      setTimeout(() => setSuccessMessage(null), 4000)
      await fetchAppointments()
    } catch (e) {
      alert('Erreur lors de l’acceptation du rendez-vous')
    }
  }

  const handleRefuseAppointment = async (id: string) => {
    try {
      await axios.patch('/api/admin/rendezvous', {
        id,
        status: 'refused',
      })
      setSuccessMessage('Rendez-vous refusé')
      setTimeout(() => setSuccessMessage(null), 4000)
      await fetchAppointments()
    } catch (e) {
      alert('Erreur lors du refus du rendez-vous')
    }
  }


  const handleSaveReschedule = async (id: string, newDate: string, newTime: string) => {
    try {
      const response = await axios.patch('/api/admin/agenda/reschedule', {
        id,
        newDate,
        newTime,
      })

      if (response.data.success) {
        // Afficher message de succès
        setSuccessMessage('Proposition de modification envoyée au client. En attente de validation.')
        setTimeout(() => setSuccessMessage(null), 5000)
        
        // Recharger les rendez-vous pour mettre à jour l'agenda
        await fetchAppointments()
      } else {
        throw new Error(response.data.error || 'Erreur lors de la modification')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Erreur lors de la modification')
    }
  }

  const visibleCollaborators = collaborators.filter(c => 
    visibleCollaboratorIds.includes(c.id)
  )

  // Attendre que currentDate soit initialisé
  if (!currentDate) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Message de succès */}
      {successMessage && (
        <div className="absolute top-4 right-4 z-50 bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header sticky */}
      <AgendaHeader
        currentDate={currentDate}
        viewMode={viewMode}
        timeInterval={timeInterval}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewModeChange={setViewMode}
        onTimeIntervalChange={handleTimeIntervalChange}
        onRefresh={fetchAppointments}
        refreshing={loading}
      />

      {/* Layout principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar gauche - cachée sur mobile, collapsible sur tablette */}
        <aside className="hidden lg:flex w-80 border-r border-gray-200 bg-white flex-col overflow-y-auto">
          {/* Mini calendrier */}
          <div className="p-4">
            <MiniCalendar
              selectedDate={currentDate}
              onDateSelect={handleDateSelect}
            />
          </div>

          {/* Filtres collaborateurs */}
          {/* TEMPORAIREMENT DÉSACTIVÉ - Fonctionnalité collaborateurs en cours de développement
          <div className="p-4 border-t border-gray-200">
            <CollaboratorFilter
              collaborators={collaborators}
              visibleCollaboratorIds={visibleCollaboratorIds}
              onVisibilityChange={setVisibleCollaboratorIds}
            />
          </div>
          */}

          {/* Info aide (optionnel) */}
          <div className="mt-auto p-4 bg-blue-50 border-t border-blue-100">
            <p className="text-xs text-blue-700">
              💡 <strong>Astuce:</strong> Cliquez sur un rendez-vous pour voir les détails complets.
            </p>
          </div>
        </aside>

        {/* Contenu principal: grille */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-sm sm:text-base text-gray-600">Chargement des rendez-vous...</p>
              </div>
            </div>
          ) : (
            <TimeGrid
              currentDate={currentDate}
              viewMode={viewMode}
              timeInterval={timeInterval}
              appointments={appointments}
              visibleCollaborators={visibleCollaborators}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
        </main>
      </div>

      {/* Modal détail rendez-vous */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedAppointment(null)
        }}
        onEdit={handleEditAppointment}
        onCancel={handleCancelAppointment}
        onAccept={handleAcceptAppointment}
        onRefuse={handleRefuseAppointment}
      />


      {/* Modal édition rendez-vous */}
      <EditAppointmentModal
        isOpen={showEditModal}
        appointment={selectedAppointment}
        onClose={() => {
          setShowEditModal(false)
          setSelectedAppointment(null)
        }}
        onSave={handleSaveReschedule}
      />
    </div>
  )
}

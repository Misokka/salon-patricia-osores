'use client'

import { useState, useEffect, Suspense } from 'react'
import { addDays, subDays, addWeeks, subWeeks, startOfToday, format } from 'date-fns'
import axios from 'axios'
import { useSearchParams } from 'next/navigation'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import AgendaHeader, { ViewMode, TimeInterval } from '@/app/components/admin/agenda/AgendaHeader'
import MiniCalendar from '@/app/components/admin/agenda/MiniCalendar'
import CollaboratorFilter, { Collaborator } from '@/app/components/admin/agenda/CollaboratorFilter'
import TimeGrid from '@/app/components/admin/agenda/TimeGrid'
import AppointmentDetailModal from '@/app/components/admin/agenda/AppointmentDetailModal'
import EditAppointmentModal from '@/app/components/admin/agenda/EditAppointmentModal'
import MobileFiltersDrawer from '@/app/components/admin/agenda/MobileFiltersDrawer'
import type { Appointment } from '@/types/appointment'

function AgendaContent() {
  const searchParams = useSearchParams()
  
  // États principaux
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('week')  // Step 7.3: Semaine par défaut
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(60)  // Step 7.3: 60 min par défaut
  
  // Initialiser currentDate et timeInterval côté client uniquement
  useEffect(() => {
    setCurrentDate(startOfToday())
    
    // Récupérer l'intervalle depuis localStorage (si déjà changé par l'utilisateur)
    const savedInterval = localStorage.getItem('agendaTimeInterval')
    const savedViewMode = localStorage.getItem('agendaViewMode')
    const savedStaffViewMode = localStorage.getItem('agendaStaffViewMode')
    
    if (savedInterval) {
      setTimeInterval(Number(savedInterval) as TimeInterval)
    }
    if (savedViewMode) {
      setViewMode(savedViewMode as ViewMode)
    }
    // Par défaut, activer la vue par membre
    if (savedStaffViewMode !== null) {
      setStaffViewMode(savedStaffViewMode === 'true')
    } else {
      setStaffViewMode(true)
    }
  }, [])
  
  // Données
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [visibleCollaboratorIds, setVisibleCollaboratorIds] = useState<string[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  
  // UI States
  const [loading, setLoading] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [staffViewMode, setStaffViewMode] = useState(false)  // Step 7.3: Vue par staff
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)  // Drawer filtres mobile

  // Ouvrir automatiquement le modal si appointmentId est dans l'URL
  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId')
    if (!appointmentId) return

    // D'abord chercher dans les rendez-vous déjà chargés
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (appointment) {
      setSelectedAppointment(appointment)
      setShowDetailModal(true)
      // Nettoyer l'URL après avoir ouvert le modal pour éviter de rouvrir à chaque action
      window.history.replaceState({}, '', '/admin/agenda')
      return
    }

    // Si pas trouvé dans la liste chargée, charger directement depuis l'API
    const fetchAppointment = async () => {
      try {
        const response = await axios.get(`/api/admin/appointments/${appointmentId}`)
        if (response.data.success && response.data.data) {
          setSelectedAppointment(response.data.data)
          setShowDetailModal(true)
          // Nettoyer l'URL après avoir ouvert le modal pour éviter de rouvrir à chaque action
          window.history.replaceState({}, '', '/admin/agenda')
        }
      } catch (error) {
        console.error('Erreur chargement rendez-vous:', error)
      }
    }

    fetchAppointment()
  }, [searchParams, appointments])

  // Charger les rendez-vous
  useEffect(() => {
    if (currentDate && staffLoaded) {
      fetchAppointments()
    }
  }, [currentDate, viewMode, visibleCollaboratorIds, staffLoaded])

  // Step 7.3: Charger les membres d'équipe
  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        const response = await axios.get('/api/admin/staff-members')
        if (response.data.success) {
          const staff = response.data.data || []
          const activeStaff = staff.filter((s: any) => s.is_active)
          
          // Transformer en format Collaborator
          const collabs: Collaborator[] = activeStaff.map((s: any) => ({
            id: s.id,
            name: s.name
          }))
          
          setCollaborators(collabs)
          // Par défaut, tous visibles
          setVisibleCollaboratorIds(collabs.map(c => c.id))
          setStaffLoaded(true)
        }
      } catch (error) {
        console.error('Erreur chargement staff:', error)
        setStaffLoaded(true) // Continuer quand même
      }
    }
    
    fetchStaffMembers()
  }, [])

  const fetchAppointments = async () => {
    if (!currentDate) return
    
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
        let appointmentsData = response.data.data || []
        
        // Step 7.3: Filtrer côté client par staff visible
        if (visibleCollaboratorIds.length > 0 && visibleCollaboratorIds.length < collaborators.length) {
          appointmentsData = appointmentsData.filter((apt: any) => 
            !apt.staff_member_id || visibleCollaboratorIds.includes(apt.staff_member_id)
          )
        }
        
        setAppointments(appointmentsData)
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

  // Step 7.3: Sauvegarder le viewMode
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agendaViewMode', mode)
    }
  }

  const handleStaffViewModeToggle = () => {
    const newValue = !staffViewMode
    setStaffViewMode(newValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem('agendaStaffViewMode', newValue.toString())
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


  const handleSaveReschedule = async (id: string, newDate: string, newTime: string, newStaffId?: string | null) => {
    try {
      const response = await axios.patch('/api/admin/agenda/reschedule', {
        id,
        newDate,
        newTime,
        newStaffId,
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
        onViewModeChange={handleViewModeChange}
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

          {/* Filtres collaborateurs - Step 7.3 */}
          {collaborators.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              {/* Toggle Vue par membre */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Vue par membre</span>
                <button
                  onClick={handleStaffViewModeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    staffViewMode ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      staffViewMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <CollaboratorFilter
                collaborators={collaborators}
                visibleCollaboratorIds={visibleCollaboratorIds}
                onVisibilityChange={setVisibleCollaboratorIds}
              />
            </div>
          )}

          {/* Info aide (optionnel) */}
          <div className="mt-auto p-4 bg-blue-50 border-t border-blue-100">
            <p className="text-xs text-blue-700">
              <strong>Astuce:</strong> Cliquez sur un rendez-vous pour voir les détails complets.
            </p>
          </div>
        </aside>

        {/* Contenu principal: grille */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
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
              staffViewMode={staffViewMode}
            />
          )}

          {/* Bouton flottant filtres (mobile uniquement) */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden fixed bottom-6 left-6 z-50 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Ouvrir les filtres"
          >
            <AdjustmentsHorizontalIcon className="w-6 h-6" />
          </button>
        </main>
      </div>

      {/* Drawer filtres mobile */}
      <MobileFiltersDrawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        currentDate={currentDate}
        onDateSelect={handleDateSelect}
        collaborators={collaborators}
        visibleCollaboratorIds={visibleCollaboratorIds}
        onVisibilityChange={setVisibleCollaboratorIds}
        staffViewMode={staffViewMode}
        onStaffViewModeToggle={handleStaffViewModeToggle}
      />

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
        onReassignSuccess={() => {
          setSuccessMessage('Rendez-vous réassigné avec succès')
          setTimeout(() => setSuccessMessage(null), 4000)
          fetchAppointments()
        }}
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

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <AgendaContent />
    </Suspense>
  )
}

'use client'

import { useMemo, useState, useEffect } from 'react'
import { isToday, isThisWeek, isBefore, startOfDay } from 'date-fns'
import apiClient from '@/lib/apiClient'
import { AnimatePresence } from 'framer-motion'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

import RendezVousCard, { type RendezVous, type StaffMember } from './RendezVousCard'
import FilterBar, { type FilterStatus, type FilterPeriod } from './FilterBar'
import RefreshButton from './RefreshButton'
import ReassignAppointmentModal from './agenda/ReassignAppointmentModal'
import EditAppointmentModal from './agenda/EditAppointmentModal'

export default function RendezVousAdmin() {
  /* ===============================
     State
  =============================== */
  const [items, setItems] = useState<RendezVous[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('tous')
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('a_venir')
  const [searchQuery, setSearchQuery] = useState('')
  const [specificDate, setSpecificDate] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Modal réassignation
  const [reassignModalOpen, setReassignModalOpen] = useState(false)
  const [reassignAppointmentId, setReassignAppointmentId] = useState<string | null>(null)
  const [reassignCurrentStaffName, setReassignCurrentStaffName] = useState<string | undefined>(undefined)

  // Modal édition
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<RendezVous | null>(null)

  /* ===============================
     Effects
  =============================== */
  useEffect(() => {
    fetchRendezVous()
    fetchStaffMembers()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, periodFilter, searchQuery, specificDate])

  /* ===============================
     API
  =============================== */
  async function fetchRendezVous() {
    try {
      setLoading(true)
      const { data } = await apiClient.get('/api/admin/rendezvous')
      if (data.success) {
        const fetchedItems = data.data || []
        setItems(fetchedItems)
        
        // Refuser automatiquement les RDV pending dont la date est passée (sans email)
        await autoRejectExpiredPendingAppointments(fetchedItems)
      }
    } catch (e) {
      console.error(e)
      showMessage('error', 'Erreur lors du chargement des rendez-vous')
    } finally {
      setLoading(false)
    }
  }

  async function autoRejectExpiredPendingAppointments(appointments: any[]) {
    const now = new Date()
    const expiredPending = appointments.filter(rdv => {
      if (rdv.status !== 'pending') return false
      
      // Calculer la date/heure de fin du RDV
      const appointmentDateTime = new Date(`${rdv.appointment_date}T${rdv.start_time}`)
      const durationMinutes = rdv.service_duration_minutes || 60
      const endDateTime = new Date(appointmentDateTime.getTime() + durationMinutes * 60000)
      
      return endDateTime < now
    })

    // Refuser silencieusement les RDV expirés (sans email)
    for (const rdv of expiredPending) {
      try {
        await apiClient.patch('/api/admin/rendezvous', {
          id: rdv.id,
          status: 'refused',
          skipEmail: true
        })
      } catch (error) {
        console.error(`Erreur refus auto RDV ${rdv.id}:`, error)
      }
    }

    // Recharger la liste si des RDV ont été refusés
    if (expiredPending.length > 0) {
      const { data } = await apiClient.get('/api/admin/rendezvous')
      if (data.success) {
        setItems(data.data || [])
      }
    }
  }

  async function fetchStaffMembers() {
    try {
      const { data } = await apiClient.get('/api/admin/staff-members')
      if (data.success) {
        setStaffMembers(data.data || [])
      }
    } catch (e) {
      console.error(e)
      // Silencieux - le staff dropdown ne sera simplement pas affiché
    }
  }

  async function assignStaff(appointmentId: string) {
    const rdv = items.find(r => r.id === appointmentId)
    if (!rdv) return

    // Ouvrir le modal de réassignation au lieu d'une popup
    setReassignAppointmentId(appointmentId)
    setReassignCurrentStaffName(rdv.staff_member_name || undefined)
    setReassignModalOpen(true)
  }

  async function updateStatus(
    id: string,
    status: 'accepted' | 'refused' | 'cancelled'
  ) {
    const backup = items.find(r => r.id === id)

    try {
      setUpdating(id)
      setItems(prev =>
        prev.map(r => (r.id === id ? { ...r, status } : r))
      )

      await apiClient.patch('/api/admin/rendezvous', { id, status })

      const messages = {
        accepted: 'Rendez-vous confirmé',
        refused: 'Rendez-vous refusé',
        cancelled: 'Rendez-vous annulé (créneaux libérés)',
      }

      showMessage('success', messages[status])
    } catch (e) {
      if (backup) {
        setItems(prev =>
          prev.map(r => (r.id === id ? backup : r))
        )
      }
      showMessage('error', 'Erreur lors de la mise à jour')
    } finally {
      setUpdating(null)
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  /* ===============================
     Computed
  =============================== */
  const counts = useMemo(
    () => ({
      tous: items.length,
      en_attente: items.filter(r => r.status === 'pending').length,
      accepte: items.filter(r => r.status === 'accepted').length,
      refuse: items.filter(r => r.status === 'refused').length,
    }),
    [items]
  )

  const allFilteredItems = useMemo(() => {
    const today = startOfDay(new Date())

    return items
      .filter(rdv => {
        if (statusFilter !== 'tous') {
          const map = {
            en_attente: 'pending',
            accepte: 'accepted',
            refuse: 'refused',
          } as const

          if (rdv.status !== map[statusFilter]) return false
        }

        const rdvDate = new Date(
          `${rdv.appointment_date}T${rdv.start_time}`
        )

        // Filtre par date spécifique (prioritaire sur les filtres de période)
        if (specificDate) {
          if (rdv.appointment_date !== specificDate) return false
        } else {
          // Filtres de période (seulement si pas de date spécifique)
          if (periodFilter === 'aujourdhui' && !isToday(rdvDate)) return false
          if (
            periodFilter === 'semaine' &&
            !isThisWeek(rdvDate, { weekStartsOn: 1 })
          )
            return false
          if (periodFilter === 'a_venir' && isBefore(rdvDate, today)) return false
          if (periodFilter === 'passes' && !isBefore(rdvDate, today)) return false
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return (
            rdv.customer_name.toLowerCase().includes(q) ||
            rdv.service_name.toLowerCase().includes(q) ||
            (rdv.customer_email ?? '').toLowerCase().includes(q) ||
            rdv.customer_phone.includes(q)
          )
        }

        return true
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1
        return `${a.appointment_date} ${a.start_time}`.localeCompare(
          `${b.appointment_date} ${b.start_time}`
        )
      })
  }, [items, statusFilter, periodFilter, searchQuery, specificDate])

  const filteredItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return allFilteredItems.slice(start, start + itemsPerPage)
  }, [allFilteredItems, currentPage])

  const totalPages = Math.ceil(allFilteredItems.length / itemsPerPage)

  const handleReassignSuccess = () => {
    fetchRendezVous() // Recharger les RDV
    showMessage('success', 'Rendez-vous réassigné avec succès')
  }

  const handleEdit = (rdv: RendezVous) => {
    setEditingAppointment(rdv)
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (id: string, newDate: string, newTime: string) => {
    try {
      await apiClient.patch('/api/admin/agenda/reschedule', {
        id,
        newDate,
        newTime,
      })
      setEditModalOpen(false)
      setEditingAppointment(null)
      showMessage('success', 'Proposition de modification envoyée au client')
      await fetchRendezVous()
    } catch (error) {
      showMessage('error', 'Erreur lors de la modification')
    }
  }

  /* ===============================
     Render
  =============================== */
  if (loading) {
    return <div className="p-12 text-center">Chargement…</div>
  }

  return (
    <div className="space-y-6">
      <FilterBar
        statusFilter={statusFilter}
        periodFilter={periodFilter}
        searchQuery={searchQuery}
        specificDate={specificDate}
        onStatusChange={setStatusFilter}
        onPeriodChange={setPeriodFilter}
        onSearchChange={setSearchQuery}
        onSpecificDateChange={setSpecificDate}
        counts={counts}
      />

      <div className="flex justify-start">
        <RefreshButton onRefresh={fetchRendezVous} loading={loading} />
      </div>

      <AnimatePresence>
        {filteredItems.map(rdv => {
          // Note: Les boutons accepter/refuser s'affichent pour tous les RDV pending
          // (nouveau RDV OU modification proposée par le client)
          
          return (
          <RendezVousCard
            key={rdv.id}
            rdv={rdv}
            staffMembers={staffMembers}
            onAccept={rdv.status === 'pending' ? updateStatus : undefined}
            onReject={rdv.status === 'pending' ? updateStatus : undefined}
            onCancel={
              rdv.status === 'accepted' || rdv.status === 'pending'
                ? updateStatus
                : undefined
            }
            onEdit={
              rdv.status === 'accepted'
                ? () => handleEdit(rdv)
                : undefined
            }
            onAssignStaff={assignStaff}
            isUpdating={updating === rdv.id}
          />
        )})}
      </AnimatePresence>

      {/* Modale d'édition */}
      <EditAppointmentModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingAppointment(null)
        }}
        appointment={editingAppointment ? {
          id: editingAppointment.id,
          customer_name: editingAppointment.customer_name,
          customer_email: editingAppointment.customer_email,
          customer_phone: editingAppointment.customer_phone,
          service_name: editingAppointment.service_name,
          appointment_date: editingAppointment.appointment_date,
          start_time: `${editingAppointment.appointment_date}T${editingAppointment.start_time}`,
          status: editingAppointment.status,
          notes: editingAppointment.message,
        } : null}
        onSave={handleSaveEdit}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow mt-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Affichage de{' '}
                <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                {' '}-{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, allFilteredItems.length)}
                </span>
                {' '}sur{' '}
                <span className="font-medium">{allFilteredItems.length}</span>
                {' '}rendez-vous
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Précédent</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Numéros de pages */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                  // N'afficher que quelques pages autour de la page actuelle
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          pageNum === currentPage
                            ? 'z-10 bg-primary text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <span
                        key={pageNum}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                      >
                        ...
                      </span>
                    )
                  }
                  return null
                })}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Suivant</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal de réassignation */}
      <ReassignAppointmentModal
        isOpen={reassignModalOpen}
        appointmentId={reassignAppointmentId}
        currentStaffName={reassignCurrentStaffName}
        onClose={() => {
          setReassignModalOpen(false)
          setReassignAppointmentId(null)
          setReassignCurrentStaffName(undefined)
        }}
        onSuccess={handleReassignSuccess}
      />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import ExceptionalHoursModal, { type ExceptionalHoursFormData } from './ExceptionalHoursModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TimeRange {
  day_of_week: number
  start_time: string
  end_time: string
  slot_frequency_minutes: number
}

interface ExceptionalHour {
  id: string
  start_date: string
  end_date: string
  type: 'closed' | 'open'
  reason?: string
  time_ranges?: TimeRange[]
}

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function HorairesExceptionnelsAdmin() {
  const [exceptionalHours, setExceptionalHours] = useState<ExceptionalHour[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id?: string
  }>({ isOpen: false })
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    data?: ExceptionalHoursFormData
  }>({ isOpen: false })
  const [cancelAppointmentsModal, setCancelAppointmentsModal] = useState<{
    isOpen: boolean
    data?: ExceptionalHoursFormData
    appointments?: any[]
  }>({ isOpen: false })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`/api/admin/horaires-exceptionnels`)
      if (res.data.success) {
        setExceptionalHours(res.data.data)
      }
    } catch (err) {
      showMessage('error', 'Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleCreate = async (data: ExceptionalHoursFormData) => {
    // Vérifier si c'est une ouverture sans créneaux
    if (data.type === 'open' && (!data.time_ranges || data.time_ranges.length === 0)) {
      setConfirmModal({ isOpen: true, data })
      return
    }

    await submitExceptionalHours(data, false)
  }

  const submitExceptionalHours = async (data: ExceptionalHoursFormData, confirmCancelAppointments: boolean) => {
    try {
      setIsSubmitting(true)

      const res = await axios.post(`/api/admin/horaires-exceptionnels`, {
        start_date: data.start_date,
        end_date: data.end_date,
        type: data.type,
        reason: data.reason || null,
        time_ranges: data.type === 'open' ? data.time_ranges : undefined,
        confirm_cancel_appointments: confirmCancelAppointments,
      })

      if (res.data.success) {
        setExceptionalHours((prev) => [...prev, res.data.data])
        setModalOpen(false)
        setCancelAppointmentsModal({ isOpen: false })
        
        // Afficher le message du backend (avec count créneaux générés si applicable)
        const message = res.data.message || (
          data.type === 'closed' ? 'Fermeture exceptionnelle créée' : 'Ouverture exceptionnelle créée'
        )
        
        // Si warning, afficher en tant qu'info (orange)
        const messageType = res.data.warning === 'no_slots_generated' ? 'error' : 'success'
        showMessage(messageType, message)
      }
    } catch (err: any) {
      console.log('🔴 Erreur création horaire exceptionnel:', err.response)
      
      // Si des RDV existent, afficher la modale de confirmation
      if (err.response?.status === 409 && err.response?.data?.requiresConfirmation) {
        console.log('⚠️ RDV existants détectés:', err.response.data.appointments)
        setCancelAppointmentsModal({
          isOpen: true,
          data,
          appointments: err.response.data.appointments
        })
        setModalOpen(false)
        return
      }
      
      console.error('❌ Erreur non gérée:', err)
      showMessage('error', err.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
      setConfirmModal({ isOpen: false })
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteModal({ isOpen: true, id })
  }

  const confirmDelete = async (id: string) => {
    setDeleteModal({ isOpen: false })

    try {
      setDeletingId(id)
      const res = await axios.delete(
        `/api/admin/horaires-exceptionnels?id=${id}`
      )

      if (res.data.success) {
        setExceptionalHours((prev) => prev.filter((h) => h.id !== id))
        
        // Afficher le message du backend (avec count créneaux restaurés si applicable)
        const message = res.data.message || 'Horaire supprimé'
        showMessage('success', message)
      }
    } catch (err) {
      showMessage('error', 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate)
    const end = parseISO(endDate)

    if (startDate === endDate) {
      return format(start, 'EEEE d MMMM yyyy', { locale: fr })
    }

    return `Du ${format(start, 'd MMM', { locale: fr })} au ${format(end, 'd MMM yyyy', {
      locale: fr,
    })}`
  }

  const sortedHours = [...exceptionalHours].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm sm:text-base text-gray-600">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3 sm:p-4 rounded-lg text-xs sm:text-sm border ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-red-100 text-red-700 border-red-200'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Horaires exceptionnels</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Gérez vos fermetures et ouvertures ponctuelles (vacances, jours fériés, etc.)
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm sm:text-base"
        >
          <PlusIcon className="w-4 sm:w-5 h-4 sm:h-5" />
          Ajouter
        </button>
      </div>

      {/* Liste */}
      {sortedHours.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
          <CalendarIcon className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-600 mb-1">Aucun horaire exceptionnel</p>
          <p className="text-xs sm:text-sm text-gray-500">
            Créez des fermetures ou ouvertures exceptionnelles pour gérer vos congés
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {sortedHours.map((hour) => (
            <motion.div
              key={hour.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg border-2 overflow-hidden transition-all ${
                hour.type === 'closed'
                  ? 'border-red-200 hover:border-red-300'
                  : 'border-green-200 hover:border-green-300'
              }`}
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    {hour.type === 'closed' ? (
                      <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
                        <XCircleIcon className="w-5 sm:w-6 h-5 sm:h-6 text-red-600" />
                      </div>
                    ) : (
                      <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                        <CalendarIcon className="w-5 sm:w-6 h-5 sm:h-6 text-green-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-sm sm:text-base font-semibold mb-1 ${
                          hour.type === 'closed' ? 'text-red-900' : 'text-green-900'
                        }`}
                      >
                        {hour.type === 'closed' ? 'Fermeture exceptionnelle' : 'Ouverture exceptionnelle'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-700 font-medium">
                        {formatDateRange(hour.start_date, hour.end_date)}
                      </p>
                      {hour.reason && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 italic">{hour.reason}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(hour.id)}
                    disabled={deletingId === hour.id}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Supprimer"
                  >
                    <TrashIcon className="w-4 sm:w-5 h-4 sm:h-5" />
                  </button>
                </div>

                {/* Plages horaires pour ouvertures */}
                {hour.type === 'open' && hour.time_ranges && hour.time_ranges.length > 0 && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ClockIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Horaires d'ouverture
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {hour.time_ranges.map((range, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm bg-gray-50 rounded-md p-2"
                        >
                          <span className="font-medium text-gray-700 sm:min-w-[80px]">
                            {DAYS_FR[range.day_of_week]}
                          </span>
                          <span className="text-gray-900">
                            {range.start_time.substring(0, 5)} - {range.end_time.substring(0, 5)}
                          </span>
                          <span className="text-xs text-gray-500">
                            (créneaux {range.slot_frequency_minutes} min)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ExceptionalHoursModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
      />

      {/* Modal Confirmation aucun créneau */}
      {confirmModal.isOpen && confirmModal.data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-[60]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <XCircleIcon className="w-5 sm:w-6 h-5 sm:h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Aucun créneau ne sera ajouté
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Vous créez une ouverture exceptionnelle sans définir de plages horaires. 
                  Aucun créneau de réservation ne sera disponible pour les clients ce jour-là.
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-700">
                  Êtes-vous sûr de vouloir continuer ?
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setConfirmModal({ isOpen: false })}
                className="flex-1 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => confirmModal.data && submitExceptionalHours(confirmModal.data, false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Confirmer sans créneaux
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Confirmation annulation RDV */}
      {cancelAppointmentsModal.isOpen && cancelAppointmentsModal.data && cancelAppointmentsModal.appointments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-[60]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6"
          >
            <div className="flex items-start gap-3 sm:gap-4 mb-4">
              <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircleIcon className="w-5 sm:w-6 h-5 sm:h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Rendez-vous existants détectés
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3">
                  <strong>{cancelAppointmentsModal.appointments.length} rendez-vous confirmé(s)</strong> existe(nt) sur cette période.
                  Si vous continuez, ces rendez-vous seront <strong>annulés</strong> et les clients recevront un email de notification.
                </p>
              </div>
            </div>

            {/* Liste des RDV */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 max-h-60 overflow-y-auto">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Rendez-vous qui seront annulés :
              </h4>
              <div className="space-y-2">
                {cancelAppointmentsModal.appointments.map((rdv) => {
                  const formattedDate = format(parseISO(rdv.date), 'EEEE d MMMM yyyy', { locale: fr })
                  const formattedTime = rdv.heure.substring(0, 5)
                  
                  return (
                    <div key={rdv.id} className="bg-white rounded-md p-2 sm:p-3 text-xs sm:text-sm">
                      <p className="font-medium text-gray-900">{rdv.nom}</p>
                      <p className="text-gray-600">
                        {rdv.service} • {formattedDate} à {formattedTime}
                      </p>
                      {rdv.email && (
                        <p className="text-xs text-gray-500 mt-1">{rdv.email}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs sm:text-sm text-amber-800">
                <strong>Action irréversible :</strong> Les clients recevront automatiquement un email d'annulation
                et pourront reprendre rendez-vous en ligne.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setCancelAppointmentsModal({ isOpen: false })}
                className="flex-1 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => cancelAppointmentsModal.data && submitExceptionalHours(cancelAppointmentsModal.data, true)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Annulation en cours...' : `Confirmer et annuler ${cancelAppointmentsModal.appointments.length} RDV`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={() => {
          if (deleteModal.id) {
            confirmDelete(deleteModal.id)
          }
        }}
        title="Supprimer l'horaire exceptionnel"
        message="Êtes-vous sûr de vouloir supprimer cet horaire exceptionnel ? Les créneaux existants seront restaurés."
        isLoading={deletingId !== null}
      />
    </div>
  )
}

'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaCalendar, FaClock, FaCut, FaSpinner, FaCheckCircle, FaTimesCircle, FaArrowLeft } from 'react-icons/fa'
import { CheckIcon } from '@heroicons/react/24/outline'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import salonConfig from '@/config/salon.config'

interface AppointmentData {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  service_id: string
  service_name: string
  service_duration: number
  service_price: number
  appointment_date: string
  start_time: string
  status: string
  staff_member_id?: string
  staff_member_name?: string
}

interface StaffMember {
  id: string
  name: string
  is_active: boolean
}

interface TimeSlot {
  date: string
  heure: string
  available_staff_count: number
  required_slots: Array<{ id: string; heure: string }>
}

function ModifyAppointmentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const id = searchParams.get('id')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!id || !token) {
      setError('Lien invalide. Veuillez utiliser le lien reçu par email.')
      setLoading(false)
      return
    }

    fetchAppointment()
  }, [id, token])

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/rendezvous/manage?id=${id}&token=${token}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Impossible de récupérer les informations du rendez-vous')
        return
      }

      setAppointment(result.data)
      // Sélectionner la date actuelle par défaut
      setSelectedDate(result.data.appointment_date)
      // Sélectionner le staff membre actuel par défaut
      if (result.data.staff_member_id) {
        setSelectedStaffId(result.data.staff_member_id)
      }
    } catch (err) {
      setError('Erreur lors du chargement des informations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffMembers()
  }, [])

  useEffect(() => {
    if (selectedDate && appointment) {
      fetchAvailableSlots(selectedDate)
    }
  }, [selectedDate, selectedStaffId, appointment])

  const fetchStaffMembers = async () => {
    try {
      const response = await fetch('/api/admin/staff-members')
      const result = await response.json()

      if (response.ok && result.success) {
        const activeStaff = (result.data || []).filter((s: StaffMember) => s.is_active)
        setStaffMembers(activeStaff)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des membres d\'équipe:', err)
    }
  }

  const fetchAvailableSlots = async (date: string) => {
    if (!appointment) return

    setLoadingSlots(true)
    setSelectedTime('')
    try {
      // Construire l'URL avec staff_member_id si sélectionné
      let url = `/api/disponibilites/available?date=${date}&service_id=${appointment.service_id}`
      if (selectedStaffId) {
        url += `&staff_member_id=${selectedStaffId}`
      }
      
      const response = await fetch(url)
      const result = await response.json()

      if (response.ok && result.success && result.data) {
        setAvailableSlots(result.data.available_slots || [])
      } else {
        setAvailableSlots([])
      }
    } catch (err) {
      console.error('Erreur lors du chargement des créneaux:', err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSlotClick = (slotTime: string) => {
    setSelectedTime(slotTime)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!id || !token || !selectedTime) {
      setError('Veuillez sélectionner un créneau')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Trouver les IDs des slots nécessaires pour ce créneau
      const selectedSlot = availableSlots.find(s => s.heure.substring(0, 5) === selectedTime)
      
      if (!selectedSlot) {
        setError('Créneau invalide')
        return
      }

      const slotIds = selectedSlot.required_slots.map(s => s.id)

      const response = await fetch('/api/rendezvous/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: id,
          token,
          newDate: selectedDate,
          newStartTime: selectedTime,
          required_slot_ids: slotIds,
          staff_member_id: selectedStaffId || null,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Erreur lors de la modification')
        return
      }

      // Redirection vers la page de succès
      router.push(`/rendezvous/modified?requiresApproval=${result.requiresApproval ? 'true' : 'false'}`)
    } catch (err) {
      setError('Erreur lors de la modification. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <FaTimesCircle className="text-red-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  if (!appointment) return null

  const formattedCurrentDate = format(parseISO(appointment.appointment_date), 'EEEE d MMMM yyyy', { locale: fr })
  const formattedCurrentTime = appointment.start_time.substring(0, 5)
  const slotsNeeded = Math.ceil(appointment.service_duration / 30)

  return (
    <div className="min-h-screen bg-light py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary text-white p-6">
            <button
              onClick={() => router.push(`/rendezvous/manage?id=${id}&token=${token}`)}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <FaArrowLeft />
              <span className="text-sm">Retour</span>
            </button>
            <h1 className="text-2xl font-bold">Modifier mon rendez-vous</h1>
            <p className="text-sm mt-2 opacity-90">{salonConfig.identity.name}</p>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Rendez-vous actuel */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Rendez-vous actuel</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FaCut className="text-primary text-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{appointment.service_name}</p>
                    <p className="text-xs text-gray-500">{appointment.service_duration} minutes • {appointment.service_price} €</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2 pt-3 border-t border-gray-200">
                  <FaCalendar className="text-gray-400" />
                  <span className="text-sm text-gray-700 capitalize">{formattedCurrentDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaClock className="text-gray-400" />
                  <span className="text-sm text-gray-700">{formattedCurrentTime}</span>
                </div>
                {appointment.staff_member_name && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-200 mt-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm text-gray-700">{appointment.staff_member_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            {/* Nouveau rendez-vous */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Choisir une nouvelle date et heure</h2>

              {/* Sélection du membre d'équipe */}
              {staffMembers.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membre d'équipe (optionnel)
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="">Aucune préférence</option>
                    {staffMembers.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Vous pouvez choisir un membre d'équipe spécifique ou laisser "Aucune préférence"
                  </p>
                </div>
              )}

              {/* Sélection de la date */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Créneaux horaires */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Créneaux disponibles pour cette date
                </label>

                {loadingSlots ? (
                  <div className="text-center py-8">
                    <FaSpinner className="animate-spin text-3xl text-primary mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Chargement des créneaux...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <FaClock className="text-4xl text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Aucun créneau disponible pour cette date</p>
                    <p className="text-xs text-gray-500 mt-1">Sélectionnez une autre date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1 bg-gray-50 rounded-lg">
                    {availableSlots.map((slot) => {
                      const slotTime = slot.heure.substring(0, 5)
                      const isSelected = selectedTime === slotTime
                      const isCurrent = appointment.start_time.substring(0, 5) === slotTime
                      
                      return (
                        <button
                          key={`${slot.date}-${slot.heure}`}
                          type="button"
                          onClick={() => handleSlotClick(slotTime)}
                          className={`
                            relative px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all
                            ${isSelected 
                              ? 'bg-primary text-white border-primary shadow-md' 
                              : isCurrent
                              ? 'bg-amber-50 text-amber-700 border-amber-300 hover:border-amber-400'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                            }
                          `}
                        >
                          {isSelected && (
                            <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 absolute top-0.5 right-0.5 sm:top-1 sm:right-1" />
                          )}
                          {isCurrent && !isSelected && (
                            <span className="text-[10px] sm:text-xs absolute -top-1 -right-1 bg-amber-500 text-white px-1 rounded">actuel</span>
                          )}
                          {slotTime}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Info sur les créneaux multiples */}
            {slotsNeeded > 1 && selectedTime && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ Ce service nécessite {slotsNeeded} créneaux consécutifs de 30 minutes
                </p>
              </div>
            )}

            {/* Error */}
            {error && appointment && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Bouton de soumission */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedTime}
              className="w-full mt-6 bg-primary text-white py-4 rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Modification en cours...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Confirmer la modification
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Besoin d'aide ? Contactez-nous au{' '}
              <a href={`tel:${salonConfig.contact.phoneLink}`} className="text-primary hover:underline">
                {salonConfig.contact.phoneDisplay}
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function ModifyAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-light flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ModifyAppointmentContent />
    </Suspense>
  )
}

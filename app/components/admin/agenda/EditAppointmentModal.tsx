'use client'

import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CalendarIcon, ClockIcon, CheckIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import axios from 'axios'

import type { Appointment } from '@/types/appointment'


interface EditAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
  onSave: (id: string, newDate: string, newTime: string) => Promise<void>
}

interface Disponibilite {
  id: string
  date: string
  heure: string
  est_disponible: boolean
}

export default function EditAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onSave,
}: EditAppointmentModalProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<Disponibilite[]>([])

  // Initialiser les champs quand l'appointment change
  useEffect(() => {
    if (appointment) {
      const startDate = new Date(appointment.start_time)
      const dateStr = format(startDate, 'yyyy-MM-dd')
      setSelectedDate(dateStr)
      setSelectedTime(format(startDate, 'HH:mm'))
      setError(null)
      fetchAvailableSlots(dateStr)
    }
  }, [appointment])

  // Recharger créneaux quand date change
  useEffect(() => {
    if (selectedDate && isOpen) {
      fetchAvailableSlots(selectedDate)
    }
  }, [selectedDate, isOpen])

  // Récupérer créneaux disponibles pour une date (depuis table disponibilites)
  const fetchAvailableSlots = async (date: string) => {
    setLoadingSlots(true)
    try {
      // Récupérer tous les créneaux de la table disponibilites pour cette date
      const response = await axios.get('/api/disponibilites', {
        params: {
          dateDebut: date,
          dateFin: date,
          disponibleUniquement: 'true',
        },
      })

      const slots = response.data || []
      
      // Récupérer les RDV déjà bookés pour ce jour (sauf le RDV actuel)
      const rdvResponse = await axios.get('/api/admin/agenda/appointments', {
        params: {
          date: date,
          viewMode: 'day',
        },
      })

      const bookedSlots = new Set(
        (rdvResponse.data?.data || [])
          .filter((rdv: any) => rdv.id !== appointment?.id && rdv.status !== 'cancelled')
          .map((rdv: any) => format(new Date(rdv.start_time), 'HH:mm'))
      )

      // Filtrer les créneaux déjà pris
      const availableSlots = slots.filter((slot: any) => {
        const slotTime = slot.start_time ? slot.start_time.substring(0, 5) : slot.heure?.substring(0, 5)
        return slotTime && !bookedSlots.has(slotTime)
      })

      setAvailableSlots(availableSlots)
    } catch (err) {
      console.error('Erreur récupération créneaux:', err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appointment || !selectedDate || !selectedTime) return

    setLoading(true)
    setError(null)

    try {
      await onSave(appointment.id, selectedDate, selectedTime)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du rendez-vous')
    } finally {
      setLoading(false)
    }
  }

  if (!appointment) return null

  const originalDate = new Date(appointment.start_time)
  const hasChanged =
    selectedDate !== format(originalDate, 'yyyy-MM-dd') ||
    selectedTime !== format(originalDate, 'HH:mm')

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-base sm:text-xl font-semibold text-gray-900">
                      Modifier le RDV
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                  {/* Info client */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Client</span>
                      <span className="text-sm text-gray-900">{appointment.customer_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Service</span>
                      <span className="text-sm text-gray-900">{appointment.service_name}</span>
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CalendarIcon className="w-4 h-4 inline mr-2" />
                      Nouvelle date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      required
                    />
                  </div>

                  {/* Créneaux disponibles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <ClockIcon className="w-4 h-4 inline mr-2" />
                      Créneaux disponibles pour cette date
                    </label>

                    {loadingSlots ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-sm text-gray-500 mt-2">Chargement des créneaux...</p>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <ClockIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Aucun créneau disponible pour cette date</p>
                        <p className="text-xs text-gray-500 mt-1">Sélectionnez une autre date ou ajoutez des créneaux dans la page Disponibilités</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1 bg-gray-50 rounded-lg">
                        {availableSlots.map((slot) => {
                          const slotTime = slot.heure.substring(0, 5)
                          const isSelected = selectedTime === slotTime
                          const isCurrent = appointment && format(new Date(appointment.start_time), 'HH:mm') === slotTime
                          
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setSelectedTime(slotTime)}
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

                  {/* Message d'avertissement */}
                  {hasChanged && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        <strong>Important :</strong> Un email sera envoyé au client pour l'informer du changement et lui demander de valider le nouveau créneau.
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !hasChanged}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

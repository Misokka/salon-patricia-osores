'use client'

import { useState, useEffect, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import apiClient from '@/lib/apiClient'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import TimeRangeModal, { type TimeRangeFormData } from './TimeRangeModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { format } from 'date-fns'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

interface SalonSettings {
  online_booking_enabled: boolean
  default_slot_frequency_minutes: number
}

interface SalonHour {
  day_of_week: number
  is_open: boolean
}

interface TimeRange {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_frequency_minutes: number
}

export default function HorairesAdmin() {
  const [settings, setSettings] = useState<SalonSettings>({
    online_booking_enabled: true,
    default_slot_frequency_minutes: 30,
  })
  const [hours, setHours] = useState<SalonHour[]>([])
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal time range
  const [timeRangeModal, setTimeRangeModal] = useState<{
    isOpen: boolean
    dayOfWeek?: number
    data?: TimeRange
  }>({ isOpen: false })

  // Modal confirmation suppression
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean
    id?: string
  }>({ isOpen: false })

  // Modal duplication
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean
    sourceDayOfWeek?: number
  }>({ isOpen: false })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // État pour gérer les jours pliés/dépliés (tous dépliés par défaut)
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get(`/api/admin/horaires`)
      if (res.data.success) {
        setSettings(res.data.data.settings)
        setHours(res.data.data.hours)
        setTimeRanges(res.data.data.ranges)
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

  // Toggle réservation en ligne
  const toggleOnlineBooking = async () => {
    try {
      const newValue = !settings.online_booking_enabled
      setSettings((prev) => ({ ...prev, online_booking_enabled: newValue }))

      const res = await apiClient.post(`/api/admin/horaires`, {
        type: 'settings',
        data: { online_booking_enabled: newValue },
      })

      if (res.data.success) {
        showMessage('success', newValue ? 'Réservation en ligne activée' : 'Réservation en ligne désactivée')
      }
    } catch (err) {
      setSettings((prev) => ({ ...prev, online_booking_enabled: !prev.online_booking_enabled }))
      showMessage('error', 'Erreur lors de la mise à jour')
    }
  }

  // Toggle jour ouvert/fermé
  const toggleDay = async (dayOfWeek: number) => {
  try {
    const currentHour = hours.find((h) => h.day_of_week === dayOfWeek)
    const newIsOpen = !currentHour?.is_open

    const res = await apiClient.post(`/api/admin/horaires`, {
      type: 'day',
      data: { day_of_week: dayOfWeek, is_open: newIsOpen },
    })

    if (res.data.success) {
      setHours((prev) => {
        // 🟢 le jour existe → update
        if (currentHour) {
          return prev.map((h) =>
            h.day_of_week === dayOfWeek ? { ...h, is_open: newIsOpen } : h
          )
        }

        // 🟢 le jour n'existe pas → ajout
        return [...prev, { day_of_week: dayOfWeek, is_open: newIsOpen }]
      })

      showMessage(
        'success',
        `${DAYS_FR[dayOfWeek]} ${newIsOpen ? 'ouvert' : 'fermé'}`
      )
    }
  } catch {
    showMessage('error', 'Erreur lors de la mise à jour')
  }
}


  // Créer ou modifier une plage horaire
  const handleCreateTimeRange = async (dayOfWeek: number, data: TimeRangeFormData) => {
    try {
      setIsSubmitting(true)

      if (data.id) {
        // Modification
        const res = await apiClient.patch(`/api/admin/horaires`, {
          id: data.id,
          start_time: data.start_time,
          end_time: data.end_time,
          slot_frequency_minutes: data.slot_frequency_minutes,
          regenerate_slots: data.generate_slots || false,
          generation_end_date: data.generation_end_date || null,
        })

        if (res.data.success) {
          setTimeRanges((prev) =>
            prev.map((r) => (r.id === data.id ? res.data.data : r))
          )
          setTimeRangeModal({ isOpen: false })
          
          const message = res.data.message || 'Plage horaire modifiée'
          showMessage('success', message)
          
          // Recharger les données pour synchroniser l'état
          await fetchData()
        }
      } else {
        // Création
        const res = await apiClient.post(`/api/admin/horaires`, {
          type: 'range',
          data: {
            day_of_week: dayOfWeek,
            start_time: data.start_time,
            end_time: data.end_time,
            slot_frequency_minutes: data.slot_frequency_minutes,
            generation_start_date: data.generate_slots ? format(new Date(), 'yyyy-MM-dd') : null,
            generation_end_date: data.generate_slots ? data.generation_end_date : null,
          },
        })

        if (res.data.success) {
          setTimeRanges((prev) => [...prev, res.data.data])
          setTimeRangeModal({ isOpen: false })
          showMessage('success', 'Plage horaire créée')

          // Générer les créneaux si demandé
          if (data.generate_slots && data.generation_end_date) {
            await generateSlots(
              dayOfWeek,
              data.start_time,
              data.end_time,
              data.slot_frequency_minutes,
              data.generation_end_date
            )
          }
        }
      }
    } catch (err) {
      showMessage('error', 'Erreur lors de la création/modification')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Générer les créneaux automatiquement
  const generateSlots = async (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    frequency: number,
    endDate: string
  ) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')

      const res = await apiClient.post(`/api/admin/horaires/generate-slots`, {
        start_date: today,
        end_date: endDate,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_frequency_minutes: frequency,
      })

      if (res.data.success && res.data.count > 0) {
        showMessage('success', `${res.data.count} créneaux générés`)
      } else if (res.data.count === 0) {
        showMessage('success', 'Aucun nouveau créneau à générer')
      }
    } catch (err) {
      console.error('Erreur génération créneaux:', err)
      showMessage('error', 'Erreur lors de la génération des créneaux')
    }
  }

  // Supprimer une plage horaire
  const handleDeleteTimeRange = async () => {
    const id = confirmDelete.id
    if (!id) return

    try {
      setDeletingId(id)
      const res = await apiClient.delete(`/api/admin/horaires?id=${id}`)

      if (res.data.success) {
        setTimeRanges((prev) => prev.filter((r) => r.id !== id))
        setConfirmDelete({ isOpen: false })
        showMessage('success', 'Plage supprimée')
      }
    } catch (err) {
      showMessage('error', 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  // Dupliquer les horaires vers un autre jour
  const handleDuplicateDay = async (sourceDayOfWeek: number, targetDayOfWeek: number) => {
    try {
      const sourceRanges = getTimeRangesForDay(sourceDayOfWeek)
      
      if (sourceRanges.length === 0) {
        showMessage('error', 'Aucune plage à dupliquer')
        return
      }

      // Créer toutes les plages pour le jour cible
      const createdRanges = []
      for (const range of sourceRanges) {
        const res = await apiClient.post(`/api/admin/horaires`, {
          type: 'range',
          data: {
            day_of_week: targetDayOfWeek,
            start_time: range.start_time,
            end_time: range.end_time,
            slot_frequency_minutes: range.slot_frequency_minutes,
            // Copier la période de génération du jour source
            generation_start_date: (range as any).generation_start_date || null,
            generation_end_date: (range as any).generation_end_date || null,
          },
        })
        if (res.data.success) {
          createdRanges.push(res.data.data)
        }
      }

      // Générer les créneaux pour chaque plage dupliquée (utiliser la période source ou 2 semaines par défaut)
      const today = format(new Date(), 'yyyy-MM-dd')
      const firstSourceRange = sourceRanges[0] as any
      const endDate = firstSourceRange.generation_end_date 
        ? firstSourceRange.generation_end_date 
        : format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

      let totalGeneratedSlots = 0
      for (const range of createdRanges) {
        const genRes = await apiClient.post(`/api/admin/horaires/generate-slots`, {
          start_date: today,
          end_date: endDate,
          day_of_week: targetDayOfWeek,
          start_time: range.start_time,
          end_time: range.end_time,
          slot_frequency_minutes: range.slot_frequency_minutes,
        })
        if (genRes.data.success) {
          totalGeneratedSlots += genRes.data.count || 0
        }
      }

      // Recharger les données
      await fetchData()
      setDuplicateModal({ isOpen: false })
      showMessage('success', `${sourceRanges.length} plage(s) dupliquée(s) avec ${totalGeneratedSlots} créneau(x) généré(s)`)
    } catch (err) {
      showMessage('error', 'Erreur lors de la duplication')
    }
  }

  // Récupérer les plages d'un jour
  const getTimeRangesForDay = (dayOfWeek: number) => {
    return timeRanges
      .filter((r) => r.day_of_week === dayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const isDayOpen = (dayOfWeek: number) => {
    return hours.find((h) => h.day_of_week === dayOfWeek)?.is_open || false
  }

  const toggleDayCollapse = (dayOfWeek: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayOfWeek)) {
        next.delete(dayOfWeek)
      } else {
        next.add(dayOfWeek)
      }
      return next
    })
  }

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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Horaires du salon</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Configurez vos jours et horaires d'ouverture standards
        </p>
      </div>

      {/* Réservation en ligne */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Prise de rendez-vous en ligne</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {settings.online_booking_enabled
                ? 'Les clients peuvent réserver en ligne'
                : 'La réservation en ligne est désactivée'}
            </p>
          </div>
          <button
            onClick={toggleOnlineBooking}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.online_booking_enabled ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.online_booking_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Jours d'ouverture */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Jours d'ouverture</h2>
        <div className="flex flex-wrap gap-2">
          {DAYS_FR.map((day, index) => {
            const isOpen = isDayOpen(index)
            return (
              <button
                key={index}
                onClick={() => toggleDay(index)}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  isOpen
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Horaires par jour */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Plages horaires</h2>
        {DAYS_FR.map((day, dayIndex) => {
          const isOpen = isDayOpen(dayIndex)
          const ranges = getTimeRangesForDay(dayIndex)
          const collapsed = collapsedDays.has(dayIndex)

          if (!isOpen) return null

          return (
            <motion.div
              key={dayIndex}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 bg-gray-50 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => toggleDayCollapse(dayIndex)}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <ChevronDownIcon
                    className={`w-4 sm:w-5 h-4 sm:h-5 text-gray-400 shrink-0 transition-transform ${
                      !collapsed ? 'rotate-180' : ''
                    }`}
                  />
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{day}</h3>
                  {ranges.length > 0 && (
                    <span className="text-xs text-gray-500 shrink-0">
                      {ranges.length} plage{ranges.length !== 1 && 's'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {ranges.length > 0 && (
                    <button
                      onClick={() =>
                        setDuplicateModal({ isOpen: true, sourceDayOfWeek: dayIndex })
                      }
                      className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                      title="Dupliquer vers un autre jour"
                    >
                      <DocumentDuplicateIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      <span className="sm:hidden">Dupl.</span>
                      <span className="hidden sm:inline">Dupliquer</span>
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setTimeRangeModal({ isOpen: true, dayOfWeek: dayIndex })
                    }
                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                  >
                    <PlusIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    <span className="sm:hidden">Ajouter</span>
                    <span className="hidden sm:inline">Ajouter une plage</span>
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {ranges.length === 0 ? (
                      <div className="p-4 sm:p-6 text-center text-gray-500 text-xs sm:text-sm">
                        Aucune plage horaire définie
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {ranges.map((range) => (
                          <div
                            key={range.id}
                            className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <ClockIcon className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900">
                                  {range.start_time.substring(0, 5)} - {range.end_time.substring(0, 5)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Créneaux de {range.slot_frequency_minutes} minutes
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            setTimeRangeModal({
                              isOpen: true,
                              dayOfWeek: dayIndex,
                              data: range,
                            })
                          }
                          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="Modifier"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDelete({ isOpen: true, id: range.id })
                          }
                          disabled={deletingId === range.id}
                          className="p-1.5 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Modales */}
      <TimeRangeModal
        isOpen={timeRangeModal.isOpen}
        onClose={() => setTimeRangeModal({ isOpen: false })}
        onSubmit={(data) =>
          timeRangeModal.dayOfWeek !== undefined
            ? handleCreateTimeRange(timeRangeModal.dayOfWeek, data)
            : Promise.resolve()
        }
        dayOfWeek={timeRangeModal.dayOfWeek!}
        dayLabel={timeRangeModal.dayOfWeek !== undefined ? DAYS_FR[timeRangeModal.dayOfWeek] : ''}
        defaultFrequency={settings.default_slot_frequency_minutes}
        initialData={timeRangeModal.data}
        isLoading={isSubmitting}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false })}
        onConfirm={handleDeleteTimeRange}
        title="Supprimer cette plage horaire ?"
        message="Cette action est irréversible. La plage horaire sera définitivement supprimée."
        isLoading={deletingId !== null}
      />

      {duplicateModal.isOpen && (
        <DuplicateDayModal
          isOpen={duplicateModal.isOpen}
          onClose={() => setDuplicateModal({ isOpen: false })}
          onConfirm={handleDuplicateDay}
          sourceDayOfWeek={duplicateModal.sourceDayOfWeek!}
          sourceDayLabel={DAYS_FR[duplicateModal.sourceDayOfWeek!]}
          availableDays={DAYS_FR.map((label, index) => ({
            value: index,
            label,
            disabled: index === duplicateModal.sourceDayOfWeek || !isDayOpen(index),
          }))}
        />
      )}
    </div>
  )
}

// Modale de duplication
function DuplicateDayModal({
  isOpen,
  onClose,
  onConfirm,
  sourceDayOfWeek,
  sourceDayLabel,
  availableDays,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (source: number, target: number) => void
  sourceDayOfWeek: number
  sourceDayLabel: string
  availableDays: Array<{ value: number; label: string; disabled: boolean }>
}) {
  const [targetDay, setTargetDay] = useState<number | null>(null)

  const handleConfirm = () => {
    if (targetDay !== null) {
      onConfirm(sourceDayOfWeek, targetDay)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                <div className="p-4 sm:p-6">
                  <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Dupliquer les horaires
                  </Dialog.Title>
                  
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    Copier les plages horaires du <strong>{sourceDayLabel}</strong> vers :
                  </p>

                  <div className="space-y-2">
                    {availableDays.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => !day.disabled && setTargetDay(day.value)}
                        disabled={day.disabled}
                        className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all ${
                          targetDay === day.value
                            ? 'border-primary bg-primary/5'
                            : day.disabled
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm sm:text-base font-medium">{day.label}</span>
                          {day.disabled && day.value !== sourceDayOfWeek && (
                            <span className="text-xs text-gray-500">(fermé)</span>
                          )}
                          {day.value === sourceDayOfWeek && (
                            <span className="text-xs text-gray-500">(source)</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 sm:mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-900">
                      ⚠️ <strong>Attention :</strong> Les plages horaires existantes du jour cible seront conservées.
                      Les nouvelles plages seront ajoutées.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={targetDay === null}
                    className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dupliquer
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

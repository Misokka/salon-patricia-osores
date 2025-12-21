'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { addDays, addWeeks, addMonths, format } from 'date-fns'
import TimeInput from './TimeInput'

interface TimeRangeModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TimeRangeFormData) => Promise<void>
  dayOfWeek: number
  dayLabel: string
  defaultFrequency: number
  initialData?: {
    id?: string
    start_time: string
    end_time: string
    slot_frequency_minutes: number
  }
  isLoading?: boolean
}

export interface TimeRangeFormData {
  id?: string
  start_time: string
  end_time: string
  slot_frequency_minutes: number
  generate_slots?: boolean
  generation_duration?: string
  generation_end_date?: string
}

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function TimeRangeModal({
  isOpen,
  onClose,
  onSubmit,
  dayOfWeek,
  dayLabel,
  defaultFrequency,
  initialData,
  isLoading = false,
}: TimeRangeModalProps) {
  const isEdit = !!initialData?.id
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [frequency, setFrequency] = useState(defaultFrequency)
  const [generateSlots, setGenerateSlots] = useState(false)
  const [generationDuration, setGenerationDuration] = useState('2_weeks')

  // Initialiser les valeurs depuis initialData
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setStartTime(initialData.start_time.substring(0, 5))
        setEndTime(initialData.end_time.substring(0, 5))
        setFrequency(initialData.slot_frequency_minutes)
        setGenerateSlots(false)
      } else {
        setStartTime('09:00')
        setEndTime('18:00')
        setFrequency(defaultFrequency)
        setGenerateSlots(false)
      }
      setGenerationDuration('2_weeks')
    }
  }, [isOpen, initialData, defaultFrequency])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const data: TimeRangeFormData = {
      start_time: startTime,
      end_time: endTime,
      slot_frequency_minutes: frequency,
      generate_slots: generateSlots, // Génération disponible en création ET édition
    }

    if (isEdit && initialData?.id) {
      data.id = initialData.id
    }

    // Calculer la date de fin selon la durée (si génération activée)
    if (generateSlots) {
      const today = new Date()
      let endDate: Date

      switch (generationDuration) {
        case '1_week':
          endDate = addWeeks(today, 1)
          break
        case '2_weeks':
          endDate = addWeeks(today, 2)
          break
        case '1_month':
          endDate = addMonths(today, 1)
          break
        case 'custom':
          endDate = new Date(formData.get('custom_end_date') as string)
          break
        default:
          endDate = addWeeks(today, 2)
      }

      data.generation_duration = generationDuration
      data.generation_end_date = format(endDate, 'yyyy-MM-dd')
    }

    await onSubmit(data)
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
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                  <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-900">
                    {isEdit ? 'Modifier la plage horaire' : 'Ajouter une plage horaire'}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {/* Jour */}
                  <div className="bg-primary/5 p-3 rounded-md">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">
                      Jour : <span className="text-primary font-semibold">{dayLabel}</span>
                    </p>
                  </div>

                  {/* Heure de début */}
                  <TimeInput
                    value={startTime}
                    onChange={setStartTime}
                    label="Heure de début"
                    required
                  />

                  {/* Heure de fin */}
                  <TimeInput
                    value={endTime}
                    onChange={setEndTime}
                    label="Heure de fin"
                    required
                  />

                  {/* Fréquence des créneaux */}
                  <div>
                    <label htmlFor="slot_frequency_minutes" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Fréquence des créneaux *
                    </label>
                    <select
                      id="slot_frequency_minutes"
                      value={frequency}
                      onChange={(e) => setFrequency(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>

                  {/* Génération automatique (seulement en mode création) */}
                  {!isEdit && (
                    <>
                      <div className="border-t border-gray-200 pt-4">
                        <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={generateSlots}
                            onChange={(e) => setGenerateSlots(e.target.checked)}
                            className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary flex-shrink-0"
                          />
                          <div>
                            <span className="text-xs sm:text-sm font-medium text-gray-900">
                              Générer les créneaux automatiquement
                            </span>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Créer les créneaux de disponibilité pour cette plage horaire
                            </p>
                          </div>
                        </label>
                      </div>

                      {generateSlots && (
                        <div className="bg-gray-50 p-3 sm:p-4 rounded-md space-y-3">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                              Période de génération
                            </label>
                            <select
                              value={generationDuration}
                              onChange={(e) => setGenerationDuration(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="1_week">1 semaine</option>
                              <option value="2_weeks">2 semaines</option>
                              <option value="1_month">1 mois</option>
                              <option value="custom">Date personnalisée</option>
                            </select>
                          </div>

                          {generationDuration === 'custom' && (
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                Jusqu'au
                              </label>
                              <input
                                type="date"
                                name="custom_end_date"
                                min={format(new Date(), 'yyyy-MM-dd')}
                                required
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          )}

                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-xs text-blue-900">
                              <strong>ℹ️ Information :</strong> Les créneaux seront créés uniquement pour les{' '}
                              <strong>{dayLabel}</strong>. Les doublons ne seront pas créés.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {isEdit ? 'Modifier' : 'Ajouter'}
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

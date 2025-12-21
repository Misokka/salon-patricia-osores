'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface ExceptionalHoursModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ExceptionalHoursFormData) => Promise<void>
  isLoading?: boolean
}

export interface ExceptionalHoursFormData {
  start_date: string
  end_date: string
  type: 'closed' | 'open'
  reason?: string
  time_ranges?: Array<{
    day_of_week: number | null
    start_time: string
    end_time: string
    slot_frequency_minutes: number
  }>
}

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function ExceptionalHoursModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ExceptionalHoursModalProps) {
  const [type, setType] = useState<'closed' | 'open'>('closed')
  const [timeRanges, setTimeRanges] = useState<any[]>([])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const data: ExceptionalHoursFormData = {
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      type,
      reason: (formData.get('reason') as string) || undefined,
    }

    if (type === 'open') {
      data.time_ranges = timeRanges.map((range, index) => ({
        day_of_week: range.day_of_week,
        start_time: formData.get(`start_time_${index}`) as string,
        end_time: formData.get(`end_time_${index}`) as string,
        slot_frequency_minutes: parseInt(formData.get(`frequency_${index}`) as string),
      }))
    }

    await onSubmit(data)
  }

  const addTimeRange = () => {
    setTimeRanges([
      ...timeRanges,
      { day_of_week: null, start_time: '09:00', end_time: '18:00', frequency: 30 },
    ])
  }

  const removeTimeRange = (index: number) => {
    setTimeRanges(timeRanges.filter((_, i) => i !== index))
  }

  // Générer les options d'heures
  const generateTimeOptions = () => {
    const options: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 bg-white z-10">
                  <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-900">
                    Ajouter un horaire exceptionnel
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
                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="start_date" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Date de début *
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        required
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="end_date" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Date de fin *
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        required
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border-2 rounded-md transition-colors hover:bg-gray-50"
                        style={{ borderColor: type === 'closed' ? '#BFA14A' : '#e5e7eb' }}>
                        <input
                          type="radio"
                          name="type"
                          value="closed"
                          checked={type === 'closed'}
                          onChange={(e) => setType('closed')}
                          className="text-primary focus:ring-primary flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-medium">Fermeture exceptionnelle</span>
                          <p className="text-xs text-gray-500">Le salon sera fermé</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border-2 rounded-md transition-colors hover:bg-gray-50"
                        style={{ borderColor: type === 'open' ? '#BFA14A' : '#e5e7eb' }}>
                        <input
                          type="radio"
                          name="type"
                          value="open"
                          checked={type === 'open'}
                          onChange={(e) => setType('open')}
                          className="text-primary focus:ring-primary flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-medium">Ouverture exceptionnelle</span>
                          <p className="text-xs text-gray-500">Horaires spéciaux</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Raison */}
                  <div>
                    <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Raison (optionnelle)
                    </label>
                    <input
                      type="text"
                      id="reason"
                      name="reason"
                      placeholder="Ex: Jour férié, Congés, Événement spécial..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {type === 'closed' ? (
                    <p className="text-xs sm:text-sm text-gray-500">
                      Si des rendez-vous sont déjà pris pendant cette période, le client sera informé par email de l'annulation.
                    </p>
                  ) : null}


                  {/* Plages horaires si ouverture exceptionnelle */}
                  {type === 'open' && (
                    <div className="border-t border-gray-200 pt-4 space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">Horaires d'ouverture</h3>
                        <button
                          type="button"
                          onClick={addTimeRange}
                          className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <PlusIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                          Ajouter une plage
                        </button>
                      </div>

                      {timeRanges.length === 0 ? (
                        <p className="text-xs sm:text-sm text-gray-500 text-center py-3 sm:py-4">
                          Aucune plage horaire définie. Cliquez sur "Ajouter une plage" pour commencer.
                        </p>
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {timeRanges.map((range, index) => (
                            <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-md space-y-2 sm:space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-medium text-gray-700">Plage {index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeTimeRange(index)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Heure début
                                  </label>
                                  <select
                                    name={`start_time_${index}`}
                                    defaultValue={range.start_time}
                                    className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    {timeOptions.map((time) => (
                                      <option key={time} value={time}>
                                        {time}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Heure fin
                                  </label>
                                  <select
                                    name={`end_time_${index}`}
                                    defaultValue={range.end_time}
                                    className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    {timeOptions.map((time) => (
                                      <option key={time} value={time}>
                                        {time}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Fréquence
                                  </label>
                                  <select
                                    name={`frequency_${index}`}
                                    defaultValue={range.frequency}
                                    className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">60 min</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Enregistrement...' : 'Créer'}
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

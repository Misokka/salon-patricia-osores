'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface TimeSlotPickerProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (time: string | string[]) => void
  selectedDate: string
  frequency: number
  existingSlots?: string[]
}

export default function TimeSlotPicker({
  isOpen,
  onClose,
  onConfirm,
  selectedDate,
  frequency,
  existingSlots = [],
}: TimeSlotPickerProps) {
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])

  const timeSlots = useMemo(() => {
    const slots: string[] = []
    const startHour = 8
    const endHour = 19

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += frequency) {
        if (minute % 5 !== 0) continue
        slots.push(
          `${hour.toString().padStart(2, '0')}:${minute
            .toString()
            .padStart(2, '0')}`
        )
      }
    }
    return slots
  }, [frequency])

  const toggleTimeSelection = (time: string) => {
    setSelectedTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    )
  }

  const handleConfirm = () => {
    if (!selectedTimes.length) return
    onConfirm(selectedTimes.length === 1 ? selectedTimes[0] : selectedTimes)
    setSelectedTimes([])
    onClose()
  }

  useEffect(() => {
    if (!isOpen) setSelectedTimes([])
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="w-full max-w-md bg-white rounded-lg shadow-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex justify-between items-center p-4 border-b">
                <div>
                  <h3 className="font-semibold">Sélectionnez un horaire</h3>
                  <p className="text-xs text-gray-500">{selectedDate}</p>
                </div>
                <button onClick={onClose}>
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 grid grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                {timeSlots.map(time => {
                  const disabled = existingSlots.includes(time)
                  const selected = selectedTimes.includes(time)

                  return (
                    <button
                      key={time}
                      disabled={disabled}
                      onClick={() => !disabled && toggleTimeSelection(time)}
                      className={`text-xs py-2 rounded ${
                        disabled
                          ? 'bg-gray-200 text-gray-400'
                          : selected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>

              <div className="p-4 border-t flex justify-end gap-2">
                <button onClick={onClose} className="text-sm text-gray-600">
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedTimes.length}
                  className="text-sm bg-primary text-white px-4 py-2 rounded disabled:bg-gray-300"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

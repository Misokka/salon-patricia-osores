'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { ComponentType } from 'react'
import {
  ChevronDownIcon,
  PlusIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { SunIcon as SunIconSolid } from '@heroicons/react/24/solid'

/* ----------------------------------------
   Types
---------------------------------------- */

interface SlotData {
  id: string
  start_time: string
  is_available: boolean
}

type ExceptionalStatus = 'none' | 'closed' | 'open'

interface DayCardProps {
  date: string
  dayLabel: string
  slots: SlotData[]
  exceptionalStatus?: ExceptionalStatus
  isToday?: boolean
  isTomorrow?: boolean
  isOpen: boolean
  onToggle: () => void
  onAddSlot: () => void
  onDeleteSlot: (id: string) => void
  onDeleteAllSlots?: () => void
}

type TimeSlotGroup = {
  label: string
  icon: ComponentType<{ className?: string }>
  slots: SlotData[]
}

/* ----------------------------------------
   Component
---------------------------------------- */

export default function DayCard({
  date,
  dayLabel,
  slots,
  exceptionalStatus = 'none',
  isToday = false,
  isTomorrow = false,
  isOpen,
  onToggle,
  onAddSlot,
  onDeleteSlot,
}: DayCardProps) {
  /* ----------------------------------------
     Slot grouping
  ---------------------------------------- */

  const groupSlotsByTimeOfDay = (slots: SlotData[]): TimeSlotGroup[] => {
    const morning = slots.filter(s => parseInt(s.start_time.slice(0, 2)) < 12)
    const afternoon = slots.filter(s => {
      const h = parseInt(s.start_time.slice(0, 2))
      return h >= 12 && h < 17
    })
    const evening = slots.filter(s => parseInt(s.start_time.slice(0, 2)) >= 17)

    const groups: TimeSlotGroup[] = []
    if (morning.length) groups.push({ label: 'Matin', icon: SunIcon, slots: morning })
    if (afternoon.length) groups.push({ label: 'Après-midi', icon: SunIconSolid, slots: afternoon })
    if (evening.length) groups.push({ label: 'Soir', icon: MoonIcon, slots: evening })

    return groups.map(group => ({
      ...group,
      slots: group.slots.sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }))
  }

  const timeGroups = groupSlotsByTimeOfDay(slots)

  const availableSlots = slots.filter(s => s.is_available)
  const hasSlots = slots.length > 0
  const allBooked = hasSlots && availableSlots.length === 0

  /* ----------------------------------------
     Badge
  ---------------------------------------- */

  const badgeClass =
    exceptionalStatus === 'closed'
      ? 'bg-red-100 text-red-700'
      : exceptionalStatus === 'open'
      ? 'bg-blue-100 text-blue-700'
      : !hasSlots
      ? 'bg-gray-100 text-gray-600'
      : allBooked
      ? 'bg-amber-100 text-amber-700'
      : 'bg-green-100 text-green-700'

  const badgeText =
    exceptionalStatus === 'closed'
      ? 'Fermé exceptionnellement'
      : exceptionalStatus === 'open'
      ? 'Ouvert exceptionnellement'
      : !hasSlots
      ? 'Aucun créneau'
      : allBooked
      ? 'Complet'
      : `${availableSlots.length} créneau${availableSlots.length > 1 ? 'x' : ''}`

  const isClosed = exceptionalStatus === 'closed'

  /* ----------------------------------------
     Render
  ---------------------------------------- */

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* HEADER */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold capitalize">{dayLabel}</h3>

            {isToday && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Aujourd’hui
              </span>
            )}

            {isTomorrow && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Demain
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500">{date}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full ${badgeClass}`}>
            {badgeText}
          </span>

          {!isClosed && (
            <button
              onClick={e => {
                e.stopPropagation()
                onAddSlot()
              }}
              className="hidden sm:flex items-center gap-1 bg-primary text-white text-xs px-3 py-1.5 rounded-md hover:bg-primary/90 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Ajouter
            </button>
          )}

          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* CONTENU */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="border-t"
          >
            <div className="p-4 space-y-4">
              {exceptionalStatus === 'closed' && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  Ce jour est <strong>fermé exceptionnellement</strong>.
                </div>
              )}

              {exceptionalStatus === 'open' && (
                <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  Ce jour est <strong>ouvert exceptionnellement</strong>.
                </div>
              )}

              {!isClosed && (
                <button
                  onClick={onAddSlot}
                  className="sm:hidden w-full flex items-center justify-center gap-2 border border-dashed border-primary text-primary rounded-lg py-2 text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Ajouter un créneau
                </button>
              )}

              {!isClosed && slots.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  Aucun créneau pour ce jour
                </div>
              )}

              {!isClosed &&
                timeGroups.map(group => (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                      <group.icon className="w-4 h-4" />
                      {group.label}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.slots.map(slot => (
                        <div
                          key={slot.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                            slot.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {slot.start_time.slice(0, 5)}

                          {slot.is_available && (
                            <button
                              onClick={() => onDeleteSlot(slot.id)}
                              className="ml-1 text-red-500 hover:text-red-700"
                              title="Supprimer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

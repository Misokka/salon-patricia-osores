'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  format,
  addDays,
  addWeeks,
  startOfWeek,
  isToday,
  isTomorrow,
  subWeeks,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import axios from 'axios'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

import DayCard from '@/app/components/admin/DayCard'
import TimeSlotPicker from '@/app/components/admin/TimeSlotPicker'
import SettingsPanel from '@/app/components/admin/SettingsPanel'

/* ----------------------------------------
   Types
---------------------------------------- */

interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  is_available: boolean
}

interface ExceptionalPeriod {
  start_date: string
  end_date: string
  type: 'closed' | 'open'
}

interface DayData {
  date: Date
  dateString: string
  dayLabel: string
  fullDateLabel: string
  slots: TimeSlot[]
}

/* ----------------------------------------
   Component
---------------------------------------- */

export default function AdminDisponibilitesPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [exceptionalClosedDays, setExceptionalClosedDays] = useState<string[]>([])
  const [exceptionalOpenDays, setExceptionalOpenDays] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const [slotFrequency, setSlotFrequency] = useState(30)

  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const [selectedDateForSlot, setSelectedDateForSlot] = useState('')
  const [selectedDayLabelForSlot, setSelectedDayLabelForSlot] = useState('')

  const [openDays, setOpenDays] = useState<Set<string>>(new Set())

  /* ----------------------------------------
     Fetch
  ---------------------------------------- */

  const fetchTimeSlots = async () => {
    const { data } = await axios.get('/api/admin/time-slots')
    setTimeSlots(data.success ? data.data : data)
  }

  const fetchExceptionalPeriods = async () => {
    const { data } = await axios.get('/api/admin/horaires-exceptionnels')

    const closed: string[] = []
    const open: string[] = []

    ;(data.data as ExceptionalPeriod[]).forEach(period => {
      const start = new Date(period.start_date)
      const end = new Date(period.end_date)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd')
        if (period.type === 'closed') closed.push(dateStr)
        if (period.type === 'open') open.push(dateStr)
      }
    })

    setExceptionalClosedDays(closed)
    setExceptionalOpenDays(open)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTimeSlots(), fetchExceptionalPeriods()])
      .finally(() => setLoading(false))
  }, [])

  /* ----------------------------------------
     Slots CRUD
  ---------------------------------------- */

  const handleAddSlot = async (time: string | string[]) => {
    const times = Array.isArray(time) ? time : [time]

    const { data } = await axios.post('/api/admin/time-slots', {
      slot_date: selectedDateForSlot,
      start_times: times,
    })

    const newSlots = data.success ? data.data : data
    setTimeSlots(prev => [...prev, ...newSlots])
  }

  const handleDeleteSlot = async (id: string) => {
    await axios.delete(`/api/admin/time-slots/${id}`)
    setTimeSlots(prev => prev.filter(s => s.id !== id))
  }

  /* ----------------------------------------
     Week days
  ---------------------------------------- */

  const weekDays: DayData[] = useMemo(() => {
    const days: DayData[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i++) {
      const date = addDays(currentWeekStart, i)
      date.setHours(0, 0, 0, 0)
      if (date < today) continue

      const dateString = format(date, 'yyyy-MM-dd')

      days.push({
        date,
        dateString,
        dayLabel: format(date, 'EEEE', { locale: fr }),
        fullDateLabel: format(date, 'd MMMM yyyy', { locale: fr }),
        slots: timeSlots.filter(s => s.slot_date === dateString),
      })
    }

    return days
  }, [currentWeekStart, timeSlots])

  /* ----------------------------------------
     Render
  ---------------------------------------- */

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Disponibilités</h1>

      <SettingsPanel
        frequency={slotFrequency}
        onFrequencyChange={setSlotFrequency}
      />

      {/* Navigation semaine (responsive) */}
      <div className="mt-4 bg-gray-50 rounded-lg p-3 space-y-2 sm:flex sm:items-center sm:justify-between sm:space-y-0">
        <div className="text-sm font-semibold text-gray-800 text-center sm:text-left">
          Semaine du{' '}
          {format(currentWeekStart, 'd MMM', { locale: fr })} au{' '}
          {format(addDays(currentWeekStart, 6), 'd MMM yyyy', { locale: fr })}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            onClick={() => setCurrentWeekStart(prev => subWeeks(prev, 1))}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-white border hover:bg-gray-100"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Précédente</span>
          </button>

          <button
            onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-white border hover:bg-gray-100"
          >
            <span className="hidden sm:inline">Suivante</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Jours */}
      <div className="space-y-3 mt-6">
        {weekDays.map(day => {
          const exceptionalStatus: 'none' | 'closed' | 'open' =
            exceptionalClosedDays.includes(day.dateString)
              ? 'closed'
              : exceptionalOpenDays.includes(day.dateString)
              ? 'open'
              : 'none'

          return (
            <DayCard
              key={day.dateString}
              date={day.fullDateLabel}
              dayLabel={day.dayLabel}
              slots={day.slots}
              exceptionalStatus={exceptionalStatus}
              isToday={isToday(day.date)}
              isTomorrow={isTomorrow(day.date)}
              isOpen={openDays.has(day.dateString)}
              onToggle={() =>
                setOpenDays(prev => {
                  const next = new Set(prev)
                  next.has(day.dateString)
                    ? next.delete(day.dateString)
                    : next.add(day.dateString)
                  return next
                })
              }
              onAddSlot={() => {
                setSelectedDateForSlot(day.dateString)
                setSelectedDayLabelForSlot(day.fullDateLabel)
                setIsTimePickerOpen(true)
              }}
              onDeleteSlot={handleDeleteSlot}
            />
          )
        })}
      </div>

      <TimeSlotPicker
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        onConfirm={handleAddSlot}
        selectedDate={selectedDayLabelForSlot}
        frequency={slotFrequency}
        existingSlots={timeSlots
          .filter(s => s.slot_date === selectedDateForSlot)
          .map(s => s.start_time.substring(0, 5))}
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

interface MiniCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

export default function MiniCalendar({ selectedDate, onDateSelect }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Jour de début pour alignement (lundi = 0)
  const startDayOfWeek = (monthStart.getDay() + 6) % 7 // Convertir dimanche=0 en lundi=0

  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 w-full">
      {/* Header mois */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePreviousMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Mois précédent"
        >
          <FaChevronLeft className="text-sm text-gray-600" />
        </button>

        <h3 className="font-semibold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h3>

        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Mois suivant"
        >
          <FaChevronRight className="text-sm text-gray-600" />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-1">
        {/* Cases vides pour alignement */}
        {Array.from({ length: startDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}

        {/* Jours du mois */}
        {daysInMonth.map(day => {
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentDay = isToday(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`
                aspect-square flex items-center justify-center text-sm rounded transition-colors
                ${!isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                ${isCurrentMonth && !isSelected && !isCurrentDay ? 'text-gray-700 hover:bg-gray-100' : ''}
                ${isSelected ? 'bg-primary text-white font-semibold' : ''}
                ${isCurrentDay && !isSelected ? 'bg-green-100 text-green-700 font-semibold' : ''}
              `}
              disabled={!isCurrentMonth}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

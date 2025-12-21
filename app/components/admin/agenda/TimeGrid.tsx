'use client'

import { format, startOfDay, addDays, isSameDay, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import AppointmentCard from './AppointmentCard'
import { TimeInterval } from './AgendaHeader'
import type { Appointment } from '@/types/appointment'

interface Collaborator {
  id: string
  name: string
}

interface TimeGridProps {
  currentDate: Date
  viewMode: 'day' | 'week'
  timeInterval: TimeInterval
  appointments: Appointment[]
  visibleCollaborators: Collaborator[]
  onAppointmentClick: (appointment: Appointment) => void
}

export default function TimeGrid({
  currentDate,
  viewMode,
  timeInterval,
  appointments,
  visibleCollaborators,
  onAppointmentClick,
}: TimeGridProps) {
  // Heure actuelle pour l'indicateur
  const [currentTime, setCurrentTime] = useState(new Date())

  // Mettre à jour l'heure toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Toutes les minutes

    return () => clearInterval(interval)
  }, [])

  // Génération des créneaux horaires (8h - 20h par défaut)
  const startHour = 8
  const endHour = 20
  const totalMinutes = (endHour - startHour) * 60
  const timeSlots: string[] = []

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += timeInterval) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      timeSlots.push(time)
    }
  }
  timeSlots.push(`${endHour}:00`) // Ajouter la dernière heure

  // Calcul de la hauteur d'un créneau
  const slotHeightPx = 60 // Hauteur de base par créneau
  const pixelsPerMinute = slotHeightPx / timeInterval

  // Colonnes à afficher
  const getColumns = () => {
    if (viewMode === 'day') {
      // Vue jour: une colonne par collaborateur
      return visibleCollaborators.map(collab => ({
        key: collab.id,
        label: collab.name,
        date: currentDate,
        collaboratorId: collab.id,
      }))
    } else {
      // Vue semaine: une colonne par jour
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Lundi
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }) // Dimanche
      const days: Date[] = []
      let day = weekStart
      while (day <= weekEnd) {
        days.push(day)
        day = addDays(day, 1)
      }
      return days.map(date => ({
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEEE d', { locale: fr }),
        date,
        collaboratorId: null,
      }))
    }
  }

  const columns = getColumns()

  // Filtrer les RDV par colonne
  const getAppointmentsForColumn = (date: Date, collaboratorId: string | null) => {
    return appointments.filter(apt => {
      const aptDate = startOfDay(new Date(apt.start_time))
      const matchesDate = isSameDay(aptDate, date)
      // En vue jour, afficher tous les RDV car pas de collaborateurs assignés
      // En vue semaine, filtrer par date uniquement
      return matchesDate
    })
  }

  // Convertir une heure en minutes depuis minuit
  const timeToMinutes = (timeString: string) => {
    const date = new Date(timeString)
    return date.getHours() * 60 + date.getMinutes()
  }

  // Calculer la position de l'indicateur d'heure actuelle
  const getCurrentTimePosition = () => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
    const minutesSinceStart = currentMinutes - (startHour * 60)
    return minutesSinceStart * pixelsPerMinute
  }

  const currentTimePosition = getCurrentTimePosition()
  const showCurrentTimeIndicator = currentTimePosition >= 0 && currentTimePosition <= totalMinutes * pixelsPerMinute

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="min-w-full">
        {/* Header des colonnes */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex">
          {/* Colonne horaires (vide pour alignement) */}
          <div className="w-16 sm:w-20 flex-shrink-0 border-r border-gray-200" />

          {/* Headers colonnes */}
          {columns.map(column => (
            <div
              key={column.key}
              className={`flex-1 px-2 py-2 sm:py-3 border-r border-gray-200 text-center ${
                viewMode === 'week' ? 'min-w-[80px] sm:min-w-0' : 'min-w-[180px]'
              }`}
            >
              <div className="font-semibold text-gray-900 capitalize text-xs sm:text-base truncate">
                {viewMode === 'week' ? format(column.date, 'EEE', { locale: fr }) : column.label}
              </div>
              {viewMode === 'week' && (
                <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                  {format(column.date, 'd MMM', { locale: fr })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Grille horaire */}
        <div className="flex">
          {/* Colonne des heures */}
          <div className="w-16 sm:w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {timeSlots.map((time, index) => (
              <div
                key={time}
                className="border-b border-gray-200 text-[10px] sm:text-xs text-gray-600 pr-1 sm:pr-2 text-right py-1"
                style={{ height: `${slotHeightPx}px` }}
              >
                {index % (60 / timeInterval) === 0 ? time : ''}
              </div>
            ))}
          </div>

          {/* Colonnes rendez-vous */}
          {columns.map(column => {
            const columnAppointments = getAppointmentsForColumn(column.date, column.collaboratorId)
            const isColumnToday = isToday(column.date)

            return (
              <div
                key={column.key}
                className={`flex-1 border-r border-gray-200 relative bg-white ${
                  viewMode === 'week' ? 'min-w-[80px] sm:min-w-0' : 'min-w-[180px]'
                }`}
              >
                {/* Lignes horaires */}
                {timeSlots.map(time => (
                  <div
                    key={time}
                    className="border-b border-gray-100"
                    style={{ height: `${slotHeightPx}px` }}
                  />
                ))}

                {/* Indicateur heure actuelle (uniquement pour aujourd'hui) */}
                {isColumnToday && showCurrentTimeIndicator && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimePosition}px` }}
                  >
                    {/* Cercle */}
                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                    {/* Ligne */}
                    <div className="h-0.5 bg-red-500" />
                  </div>
                )}

                {/* Rendez-vous positionnés absolus */}
                {columnAppointments.map(apt => {
                  const startMinutes = timeToMinutes(apt.start_time) - (startHour * 60)
                  const endMinutes = timeToMinutes(apt.end_time) - (startHour * 60)
                  const durationMinutes = endMinutes - startMinutes

                  return (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onClick={() => onAppointmentClick(apt)}
                      startMinutes={startMinutes}
                      durationMinutes={durationMinutes}
                      pixelsPerMinute={pixelsPerMinute}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

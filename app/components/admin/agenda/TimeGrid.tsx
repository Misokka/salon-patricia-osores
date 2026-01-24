'use client'

import { format, startOfDay, addDays, isSameDay, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useState, useMemo } from 'react'
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
  staffViewMode?: boolean  // Step 7.3: Vue par staff (colonnes)
}

// Palette de couleurs pour différencier les staff
const STAFF_COLOR_PALETTE = [
  { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-900', headerBg: 'bg-blue-50' },
  { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-900', headerBg: 'bg-emerald-50' },
  { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-900', headerBg: 'bg-purple-50' },
  { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-900', headerBg: 'bg-orange-50' },
  { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-900', headerBg: 'bg-pink-50' },
  { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-900', headerBg: 'bg-cyan-50' },
  { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900', headerBg: 'bg-amber-50' },
  { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-900', headerBg: 'bg-indigo-50' },
]

// Cache des couleurs par staff
const staffColorCache: Record<string, typeof STAFF_COLOR_PALETTE[0]> = {}

export function getStaffColor(staffId: string | null | undefined, staffList?: Collaborator[]) {
  if (!staffId) return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', headerBg: 'bg-gray-50' }
  
  if (!staffColorCache[staffId]) {
    // Trouver l'index dans la liste ou utiliser un hash
    if (staffList) {
      const index = staffList.findIndex(s => s.id === staffId)
      staffColorCache[staffId] = STAFF_COLOR_PALETTE[index >= 0 ? index % STAFF_COLOR_PALETTE.length : 0]
    } else {
      // Fallback: utiliser le nombre de couleurs déjà assignées
      const existingCount = Object.keys(staffColorCache).length
      staffColorCache[staffId] = STAFF_COLOR_PALETTE[existingCount % STAFF_COLOR_PALETTE.length]
    }
  }
  
  return staffColorCache[staffId]
}

export default function TimeGrid({
  currentDate,
  viewMode,
  timeInterval,
  appointments,
  visibleCollaborators,
  onAppointmentClick,
  staffViewMode = false,
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
      // Vue jour: une colonne par collaborateur visible
      if (visibleCollaborators.length === 0) {
        return [{
          key: 'all',
          label: 'Tous les RDV',
          date: currentDate,
          collaboratorId: null,
        }]
      }
      return visibleCollaborators.map(collab => ({
        key: collab.id,
        label: collab.name,
        date: currentDate,
        collaboratorId: collab.id,
      }))
    }
    
    // Vue semaine
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Lundi
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    
    if (staffViewMode && visibleCollaborators.length > 0) {
      // Vue semaine par staff: matrice jours x staff
      // Adaptation dynamique selon le nombre de membres
      const staffToShow = visibleCollaborators // Ne plus limiter
      const matrixColumns: Array<{
        key: string
        label: string
        dayLabel: string
        staffLabel: string
        date: Date
        collaboratorId: string
        isStaffColumn: true
      }> = []
      
      days.forEach(day => {
        staffToShow.forEach(staff => {
          matrixColumns.push({
            key: `${format(day, 'yyyy-MM-dd')}-${staff.id}`,
            label: staff.name,
            dayLabel: format(day, 'EEE d', { locale: fr }),
            staffLabel: staff.name,
            date: day,
            collaboratorId: staff.id,
            isStaffColumn: true,
          })
        })
      })
      
      return matrixColumns
    }
    
    // Vue semaine classique: une colonne par jour
    return days.map(date => ({
      key: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE d', { locale: fr }),
      date,
      collaboratorId: null,
    }))
  }

  const columns = getColumns()

  // Filtrer les RDV par colonne
  const getAppointmentsForColumn = (date: Date, collaboratorId: string | null) => {
    return appointments.filter(apt => {
      const aptDate = startOfDay(new Date(apt.start_time))
      const matchesDate = isSameDay(aptDate, date)
      
      // En vue staff: filtrer aussi par staff_member_id
      if (collaboratorId) {
        const aptStaffId = (apt as any).staff_member_id
        return matchesDate && aptStaffId === collaboratorId
      }
      
      // En vue semaine classique: filtrer par date uniquement
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

  // Pré-assigner les couleurs aux staff pour la cohérence
  useMemo(() => {
    visibleCollaborators.forEach((collab) => {
      getStaffColor(collab.id, visibleCollaborators)
    })
  }, [visibleCollaborators])

  // Déterminer si on est en mode matrice (semaine + staff)
  const isMatrixMode = viewMode === 'week' && staffViewMode && visibleCollaborators.length > 0
  const staffToShow = visibleCollaborators // Tous les membres visibles

  // Obtenir les jours de la semaine pour le header matrice
  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }
  const weekDays = isMatrixMode ? getWeekDays() : []

  // Calculer la largeur minimale dynamique en mode matrice
  // 80px (colonne heure) + (nombre de jours × nombre de staff × 100px par colonne)
  const matrixMinWidth = isMatrixMode ? 80 + (7 * staffToShow.length * 100) : 0

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {/* Wrapper avec min-width adaptatif */}
      <div style={{ minWidth: isMatrixMode ? `${matrixMinWidth}px` : viewMode === 'week' ? '600px' : '100%' }}>
        {/* Header des colonnes */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          
          {/* En mode matrice: Header niveau 1 = Jours */}
          {isMatrixMode && (
            <div className="flex border-b border-gray-300">
              <div className="w-16 sm:w-20 flex-shrink-0 border-r border-gray-200" />
              {weekDays.map(day => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`px-1 py-2 text-center font-semibold border-r border-gray-300 ${
                    isToday(day) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}
                  style={{ flex: staffToShow.length }}
                >
                  {/* Mobile : format court */}
                  <div className="sm:hidden">
                    <span className="capitalize text-xs font-semibold">{format(day, 'EEE', { locale: fr })}</span>
                    <span className="ml-1 text-xs">{format(day, 'd', { locale: fr })}</span>
                  </div>
                  {/* Desktop : format long */}
                  <div className="hidden sm:block">
                    <span className="capitalize text-sm">{format(day, 'EEEE', { locale: fr })}</span>
                    <span className="ml-1 text-xs text-gray-600">{format(day, 'd MMM', { locale: fr })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Header niveau 2 (ou unique si pas matrice) = Colonnes */}
          <div className="flex">
            <div className="w-16 sm:w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50" />

            {isMatrixMode ? (
              // Mode matrice: headers staff répétés pour chaque jour
              weekDays.map(day => (
                staffToShow.map((staff, staffIdx) => {
                  const color = getStaffColor(staff.id, visibleCollaborators)
                  // Initiales pour mobile
                  const initials = staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  
                  return (
                    <div
                      key={`${format(day, 'yyyy-MM-dd')}-${staff.id}-header`}
                      className={`flex-1 px-1 py-2 text-center border-r ${
                        staffIdx === staffToShow.length - 1 ? 'border-r-2 border-r-gray-300' : 'border-r-gray-200'
                      } ${color.headerBg}`}
                    >
                      {/* Mobile : initiales */}
                      <div className={`sm:hidden text-xs font-bold ${color.text}`} title={staff.name}>
                        {initials}
                      </div>
                      {/* Desktop : nom complet */}
                      <div className={`hidden sm:block text-xs font-medium truncate ${color.text}`}>
                        {staff.name}
                      </div>
                    </div>
                  )
                })
              ))
            ) : (
              // Mode normal: headers simples
              columns.map(column => {
                const color = column.collaboratorId ? getStaffColor(column.collaboratorId, visibleCollaborators) : null
                const isWeekView = viewMode === 'week'
                
                return (
                  <div
                    key={column.key}
                    className={`flex-1 px-1 sm:px-2 py-2 sm:py-3 border-r border-gray-200 text-center ${
                      color ? color.headerBg : ''
                    } ${isWeekView ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[150px]'}`}
                  >
                    {/* En vue jour: nom du staff */}
                    {viewMode === 'day' ? (
                      <>
                        {/* Mobile : initiales du staff */}
                        {column.collaboratorId && (
                          <div className={`sm:hidden text-xs font-bold ${color?.text || 'text-gray-900'}`} title={column.label}>
                            {column.label.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        {/* Desktop : nom complet */}
                        <div className={`hidden sm:block font-semibold capitalize text-xs sm:text-sm truncate ${
                          color ? color.text : 'text-gray-900'
                        }`}>
                          {column.label}
                        </div>
                        {!column.collaboratorId && (
                          <div className="sm:hidden font-semibold text-xs text-gray-900">Tous</div>
                        )}
                      </>
                    ) : (
                      // En vue semaine: jour
                      <>
                        <div className={`font-semibold capitalize text-xs sm:text-sm ${
                          color ? color.text : 'text-gray-900'
                        }`}>
                          {format(column.date, 'EEE', { locale: fr })}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                          {format(column.date, 'd', { locale: fr })}
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
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
          {isMatrixMode ? (
            // Mode matrice: colonnes jour x staff
            weekDays.map(day => (
              staffToShow.map((staff, staffIdx) => {
                const columnAppointments = getAppointmentsForColumn(day, staff.id)
                const isColumnToday = isToday(day)
                const color = getStaffColor(staff.id, visibleCollaborators)

                return (
                  <div
                    key={`${format(day, 'yyyy-MM-dd')}-${staff.id}-col`}
                    className={`flex-1 border-r relative ${
                      staffIdx === staffToShow.length - 1 ? 'border-r-2 border-r-gray-300' : 'border-r-gray-200'
                    }`}
                    style={{ 
                      backgroundColor: isColumnToday ? '#f0f9ff' : 'white' 
                    }}
                  >
                    {/* Lignes horaires */}
                    {timeSlots.map(time => (
                      <div
                        key={time}
                        className="border-b border-gray-100"
                        style={{ height: `${slotHeightPx}px` }}
                      />
                    ))}

                    {/* Indicateur heure actuelle */}
                    {isColumnToday && staffIdx === 0 && showCurrentTimeIndicator && (
                      <div
                        className="absolute left-0 z-20 pointer-events-none"
                        style={{ 
                          top: `${currentTimePosition}px`,
                          right: `-${(staffToShow.length - 1) * 100 + (staffToShow.length - 1) * 2}px`
                        }}
                      >
                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                        <div className="h-0.5 bg-red-500" style={{ width: `${staffToShow.length * 100 + 100}px` }} />
                      </div>
                    )}

                    {/* Rendez-vous */}
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
                          staffColor={color}
                          compact={true}
                        />
                      )
                    })}
                  </div>
                )
              })
            ))
          ) : (
            // Mode normal
            columns.map(column => {
              const columnAppointments = getAppointmentsForColumn(column.date, column.collaboratorId)
              const isColumnToday = isToday(column.date)
              const color = column.collaboratorId ? getStaffColor(column.collaboratorId, visibleCollaborators) : null

              return (
                <div
                  key={column.key}
                  className={`flex-1 border-r border-gray-200 relative bg-white ${
                    viewMode === 'week' ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[150px]'
                  }`}
                  style={{ backgroundColor: isColumnToday ? '#f0f9ff' : undefined }}
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
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                      <div className="h-0.5 bg-red-500" />
                    </div>
                  )}

                  {/* Rendez-vous positionnés absolus */}
                  {columnAppointments.map(apt => {
                    const startMinutes = timeToMinutes(apt.start_time) - (startHour * 60)
                    const endMinutes = timeToMinutes(apt.end_time) - (startHour * 60)
                    const durationMinutes = endMinutes - startMinutes
                    const aptStaffId = (apt as any).staff_member_id
                    const aptColor = aptStaffId ? getStaffColor(aptStaffId, visibleCollaborators) : color

                    return (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        onClick={() => onAppointmentClick(apt)}
                        startMinutes={startMinutes}
                        durationMinutes={durationMinutes}
                        pixelsPerMinute={pixelsPerMinute}
                        staffColor={aptColor}
                        compact={viewMode === 'week'}
                      />
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { Appointment } from '@/types/appointment'


interface StaffColor {
  bg: string
  border: string
  text: string
  headerBg?: string
}

interface AppointmentCardProps {
  appointment: Appointment
  onClick: () => void
  startMinutes: number // Position de début en minutes depuis minuit
  durationMinutes: number // Durée du RDV
  pixelsPerMinute: number // Facteur de conversion pour hauteur
  staffColor?: StaffColor | null // Couleur du staff membre
  compact?: boolean // Mode compact pour vue semaine
}

export default function AppointmentCard({
  appointment,
  onClick,
  startMinutes,
  durationMinutes,
  pixelsPerMinute,
  staffColor,
  compact = false,
}: AppointmentCardProps) {
  // Calcul de la position et hauteur
  const top = startMinutes * pixelsPerMinute
  const height = Math.max(durationMinutes * pixelsPerMinute, compact ? 30 : 40) // Hauteur minimum

  // Couleurs selon statut (fallback si pas de staffColor)
  const statusColors = {
    accepted: 'bg-blue-50 border-blue-400 hover:bg-blue-100',
    pending: 'bg-yellow-50 border-yellow-400 hover:bg-yellow-100',
    refused: 'bg-red-50 border-red-400 hover:bg-red-100',
    cancelled: 'bg-gray-50 border-gray-400 hover:bg-gray-100',
  }

  const textColors = {
    accepted: 'text-blue-900',
    pending: 'text-yellow-900',
    refused: 'text-red-900',
    cancelled: 'text-gray-600',
  }

  // Utiliser la couleur staff si disponible, sinon couleur par statut
  const getColorClasses = () => {
    if (staffColor) {
      // Utiliser couleur staff avec indication de statut via l'opacité
      const opacity = appointment.status === 'cancelled' || appointment.status === 'refused' 
        ? 'opacity-50' 
        : ''
      return {
        container: `${staffColor.bg} ${staffColor.border} hover:brightness-95 ${opacity}`,
        text: staffColor.text,
      }
    }
    return {
      container: statusColors[appointment.status],
      text: textColors[appointment.status],
    }
  }

  const colors = getColorClasses()

  // Z-index: rendez-vous annulés en arrière-plan
  const zIndex = appointment.status === 'cancelled' ? 'z-0' : 'z-10'

const startDate =
  appointment.appointment_date && appointment.start_time
    ? new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    : null

const endDate =
  startDate && !isNaN(startDate.getTime())
    ? new Date(startDate.getTime() + durationMinutes * 60000)
    : null



  return (
    <div
      onClick={onClick}
      className={`absolute left-0 right-0 mx-0.5 px-1.5 py-0.5 rounded border-l-4 cursor-pointer transition-all duration-150 ${colors.container} ${colors.text} ${zIndex} overflow-hidden`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      {/* Nom client */}
      <div className={`font-semibold truncate ${compact ? 'text-xs' : 'text-sm'}`}>
        {appointment.customer_name}
      </div>

      {/* Service */}
      {(!compact || height > 40) && (
        <div className="text-xs truncate opacity-90">
          {appointment.service_name}
        </div>
      )}

      {/* Horaires (si assez de place) */}
      {height > 60 && startDate && endDate && (
        <div className="text-xs opacity-75 mt-0.5">
          {format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')}
        </div>
      )}

      {/* Indicateur de statut pour les RDV non acceptés (petit badge) */}
      {staffColor && appointment.status !== 'accepted' && (
        <div className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${
          appointment.status === 'pending' ? 'bg-yellow-500' :
          appointment.status === 'refused' ? 'bg-red-500' :
          'bg-gray-500'
        }`} title={appointment.status} />
      )}
    </div>
  )
}

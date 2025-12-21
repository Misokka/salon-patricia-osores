'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { Appointment } from '@/types/appointment'


interface AppointmentCardProps {
  appointment: Appointment
  onClick: () => void
  startMinutes: number // Position de début en minutes depuis minuit
  durationMinutes: number // Durée du RDV
  pixelsPerMinute: number // Facteur de conversion pour hauteur
}

export default function AppointmentCard({
  appointment,
  onClick,
  startMinutes,
  durationMinutes,
  pixelsPerMinute,
}: AppointmentCardProps) {
  // Calcul de la position et hauteur
  const top = startMinutes * pixelsPerMinute
  const height = Math.max(durationMinutes * pixelsPerMinute, 40) // Hauteur minimum 40px

  // Couleurs selon statut
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
      className={`absolute left-0 right-0 mx-1 px-2 py-1 rounded border-l-4 cursor-pointer transition-all duration-150 ${statusColors[appointment.status]} ${textColors[appointment.status]} overflow-hidden`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      {/* Nom client */}
      <div className="font-semibold text-sm truncate">
        {appointment.customer_name}
      </div>

      {/* Service */}
      <div className="text-xs truncate opacity-90">
        {appointment.service_name}
      </div>

      {/* Horaires (si assez de place) */}
      {height > 60 && startDate && endDate && (
        <div className="text-xs opacity-75 mt-0.5">
          {format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')}
        </div>
      )}

    </div>
  )
}

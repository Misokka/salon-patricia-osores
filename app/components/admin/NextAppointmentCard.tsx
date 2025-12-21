import Link from 'next/link'
import { FaCalendarAlt, FaClock, FaUser, FaCut, FaArrowRight } from 'react-icons/fa'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { Appointment } from '@/types/appointment'


interface NextAppointmentCardProps {
  appointment?: Appointment | null
}

export default function NextAppointmentCard({ appointment }: NextAppointmentCardProps) {
  if (!appointment) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaCalendarAlt className="text-2xl text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Aucun rendez-vous prévu
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Consultez l'agenda pour voir vos prochains rendez-vous
        </p>
        <Link
          href="/admin/agenda"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
        >
          <span>Voir l'agenda</span>
          <FaArrowRight className="text-xs" />
        </Link>
      </div>
    )
  }

  // Formater la date
  const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
  const formattedDate = format(appointmentDate, "EEEE d MMMM", { locale: fr })
  const formattedTime = appointment.start_time.substring(0, 5)

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    accepted: 'bg-green-100 text-green-700 border-green-200',
    refused: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
  }

  const statusLabels = {
    pending: 'À confirmer',
    accepted: 'Confirmé',
    refused: 'Annulé',
    cancelled: 'Annulé',
  }

  const statusColor = statusColors[appointment.status as keyof typeof statusColors] || statusColors.accepted
  const statusLabel = statusLabels[appointment.status as keyof typeof statusLabels] || 'Confirmé'

  return (
    <div className="bg-gradient-to-br from-primary/5 to-white border border-primary/20 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Prochain rendez-vous
          </h3>
          <p className="text-xs text-gray-500 capitalize">
            {formattedDate}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Détails */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaUser className="text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Client</p>
            <p className="font-semibold text-gray-900">{appointment.customer_name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaCut className="text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Service</p>
            <p className="font-semibold text-gray-900">{appointment.service_name ?? '-'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <FaClock className="text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Heure</p>
            <p className="font-semibold text-gray-900">{formattedTime}</p>
          </div>
        </div>
      </div>

      {/* Action */}
      <Link
        href={`/admin/rendezvous`}
        className="w-full flex items-center justify-center space-x-2 px-5 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
      >
        <span>Voir le rendez-vous</span>
        <FaArrowRight className="text-sm" />
      </Link>
    </div>
  )
}

'use client'

import Link from 'next/link'
import axios from 'axios'
import { useState } from 'react'
import { FaCalendarAlt, FaClock, FaUser } from 'react-icons/fa'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { Appointment } from '@/types/appointment'

interface Props {
  request: Appointment | null
  onActionComplete?: () => void
}

export default function RecentRequestsCard({ request, onActionComplete }: Props) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  const handleAction = async (status: 'accepted' | 'refused') => {
    if (!request) return

    try {
      setIsUpdating(true)
      await axios.patch(`/api/admin/rendezvous/${request.id}`, { status })
      onActionComplete?.()
    } catch (error) {
      console.error('Erreur mise à jour RDV:', error)
    } finally {
      setIsUpdating(false)
      setShowRejectConfirm(false)
    }
  }

  if (!request) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2">Dernière demande</h3>
        <p className="text-sm text-gray-500">Aucune demande en attente</p>
      </div>
    )
  }

  const appointmentDate = new Date(`${request.appointment_date}T${request.start_time}`)
  const formattedDate = format(appointmentDate, 'EEEE d MMMM', { locale: fr })
  const formattedTime = request.start_time.substring(0, 5)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Dernière demande
        </h3>
        <Link
          href="/admin/rendezvous"
          className="text-sm text-primary font-medium hover:text-primary/80"
        >
          Voir toutes
        </Link>
      </div>

      {/* Contenu */}
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FaUser className="text-gray-400 text-sm" />
          <p className="font-semibold text-gray-900">
            {request.customer_name}
          </p>
        </div>

        {request.service_name && (
          <p className="text-sm text-gray-600">
            {request.service_name}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FaCalendarAlt />
            <span className="capitalize">{formattedDate}</span>
          </span>
          <span className="flex items-center gap-1">
            <FaClock />
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Actions */}
      {request.status === 'pending' && (
        <div className="flex gap-2">
          {!showRejectConfirm ? (
            <>
              <button
                onClick={() => handleAction('accepted')}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                {isUpdating ? 'Envoi…' : 'Confirmer'}
              </button>

              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
                Refuser
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleAction('refused')}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                Confirmer refus
              </button>

              <button
                onClick={() => setShowRejectConfirm(false)}
                disabled={isUpdating}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                Annuler
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

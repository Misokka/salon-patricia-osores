'use client'

import { motion } from 'framer-motion'
import { format, addMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CalendarIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'

/**
 * Modèle aligné BDD / API
 */
export type RendezVous = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_name: string
  service_duration_minutes?: number // ✅ AJOUT : durée du service en minutes
  appointment_date: string
  start_time: string
  message?: string
  status: 'pending' | 'accepted' | 'refused' | 'cancelled'
  created_at: string
}

interface RendezVousCardProps {
  rdv: RendezVous
  onAccept?: (id: string, status: 'accepted') => void
  onReject?: (id: string, status: 'refused') => void
  onCancel?: (id: string, status: 'cancelled') => void
  onEdit?: (rdv: RendezVous) => void
  isUpdating?: boolean
}

export default function RendezVousCard({
  rdv,
  onAccept,
  onReject,
  onCancel,
  onEdit,
  isUpdating = false,
}: RendezVousCardProps) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const startDateTime = useMemo(() => {
    return new Date(`${rdv.appointment_date}T${rdv.start_time}`)
  }, [rdv.appointment_date, rdv.start_time])

  const formattedDate = useMemo(() => {
    return format(startDateTime, 'EEE d MMM', { locale: fr })
  }, [startDateTime])

  const timeRangeLabel = useMemo(() => {
    const start = format(startDateTime, 'HH:mm')
    const startDisplay = start.replace(':', 'h')

    const duration = rdv.service_duration_minutes
    if (!duration || duration <= 0) {
      // fallback : si pas de durée dispo, on affiche juste l'heure de début
      return startDisplay
    }

    const endDateTime = addMinutes(startDateTime, duration)
    const end = format(endDateTime, 'HH:mm').replace(':', 'h')

    return `${startDisplay} - ${end}`
  }, [startDateTime, rdv.service_duration_minutes])

  const isToday =
    rdv.appointment_date === new Date().toISOString().split('T')[0]

  const getStatusBadge = () => {
    switch (rdv.status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
            En attente
          </span>
        )
      case 'accepted':
        return (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
            Confirmé
          </span>
        )
      case 'refused':
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
            Refusé
          </span>
        )
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">
            Annulé
          </span>
        )
    }
  }

  const handleReject = () => {
    onReject?.(rdv.id, 'refused')
    setShowRejectConfirm(false)
  }

  const handleCancel = () => {
    onCancel?.(rdv.id, 'cancelled')
    setShowCancelConfirm(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`bg-white rounded-lg border transition-all hover:shadow-sm ${
        rdv.status === 'pending' ? 'border-amber-200' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
          {/* ===== CONTENU GAUCHE ===== */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">
                {rdv.customer_name}
              </h3>

              {isToday && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  Aujourd’hui
                </span>
              )}

              <div className="sm:hidden ml-auto">{getStatusBadge()}</div>
            </div>

            {/* Date & heure (plage) */}
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="capitalize">{formattedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5" />
                <span className="font-medium">{timeRangeLabel}</span>
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-col sm:flex-row gap-2 text-xs text-gray-600">
              <a
                href={`tel:${rdv.customer_phone}`}
                className="flex items-center gap-1 hover:text-primary"
              >
                <PhoneIcon className="w-3.5 h-3.5" />
                {rdv.customer_phone}
              </a>

              {rdv.customer_email && (
                <a
                  href={`mailto:${rdv.customer_email}`}
                  className="flex items-center gap-1 truncate hover:text-primary"
                >
                  <EnvelopeIcon className="w-3.5 h-3.5" />
                  {rdv.customer_email}
                </a>
              )}
            </div>

            {/* Service */}
            <div className="text-sm font-medium text-gray-900">
              {rdv.service_name}
              {typeof rdv.service_duration_minutes === 'number' &&
                rdv.service_duration_minutes > 0 && (
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    ({rdv.service_duration_minutes} min)
                  </span>
                )}
            </div>

            {/* Message */}
            {rdv.message && (
              <div className="pt-2 border-t border-gray-100 flex gap-2 text-sm text-gray-700">
                <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                {rdv.message}
              </div>
            )}
          </div>

          {/* ===== COLONNE DROITE (ACTIONS) ===== */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="hidden sm:block">{getStatusBadge()}</div>

            {/* Confirmé */}
            {rdv.status === 'accepted' && (
              <>
                {onEdit && (
                  <button
                    onClick={() => onEdit(rdv)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Modifier
                  </button>
                )}

                {onCancel && (
                  <>
                    {!showCancelConfirm ? (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 text-xs font-medium rounded-md hover:bg-red-50"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Annuler
                      </button>
                    ) : (
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md"
                      >
                        <CheckIcon className="w-4 h-4" />
                        Confirmer
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* En attente */}
            {rdv.status === 'pending' && onAccept && onReject && (
              <>
                <button
                  onClick={() => onAccept(rdv.id, 'accepted')}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckIcon className="w-4 h-4" />
                  Accepter
                </button>

                {!showRejectConfirm ? (
                  <button
                    onClick={() => setShowRejectConfirm(true)}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Refuser
                  </button>
                ) : (
                  <button
                    onClick={handleReject}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md"
                  >
                    <CheckIcon className="w-4 h-4" />
                    Confirmer
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

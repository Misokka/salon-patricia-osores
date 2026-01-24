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
  UserIcon,
} from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { getStaffColor } from './agenda/TimeGrid'

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
  staff_member_id?: string | null
  staff_member_name?: string | null
  proposed_date?: string | null
  proposed_start_time?: string | null
}

/**
 * Staff member pour le dropdown de réassignation
 */
export type StaffMember = {
  id: string
  name: string
  is_active: boolean
}

interface RendezVousCardProps {
  rdv: RendezVous
  staffMembers?: StaffMember[]
  onAccept?: (id: string, status: 'accepted') => void
  onReject?: (id: string, status: 'refused') => void
  onCancel?: (id: string, status: 'cancelled') => void
  onEdit?: (rdv: RendezVous) => void
  onAssignStaff?: (appointmentId: string) => void // Simplifié : juste l'ID du RDV
  isUpdating?: boolean
}

export default function RendezVousCard({
  rdv,
  staffMembers = [],
  onAccept,
  onReject,
  onCancel,
  onEdit,
  onAssignStaff,
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
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto] gap-3 sm:gap-4 items-start">
          {/* ===== CONTENU GAUCHE ===== */}
          <div className="flex-1 min-w-0 space-y-2 w-full">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold truncate">
                {rdv.customer_name}
              </h3>

              {isToday && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] sm:text-xs font-medium">
                  Aujourd'hui
                </span>
              )}

              {getStatusBadge()}
            </div>

            {/* Date & heure (plage) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="capitalize">{formattedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5" />
                <span className="font-medium">{timeRangeLabel}</span>
              </div>
            </div>

            {/* Nouvelle date/heure proposée par le client */}
            {(rdv.proposed_date || rdv.proposed_start_time) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                <p className="text-[10px] sm:text-xs font-medium text-amber-800 mb-1">→ Nouvelle date demandée :</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-amber-700">
                  {rdv.proposed_date && (
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span className="capitalize font-medium">
                        {format(new Date(rdv.proposed_date), 'EEEE d MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  )}
                  {rdv.proposed_start_time && (
                    <div className="flex items-center gap-1.5">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {rdv.proposed_start_time.substring(0, 5)}
                        {typeof rdv.service_duration_minutes === 'number' && rdv.service_duration_minutes > 0 && (
                          <> - {format(addMinutes(new Date(`2000-01-01T${rdv.proposed_start_time}`), rdv.service_duration_minutes), 'HH:mm')}</>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-600">
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
                  <span className="truncate">{rdv.customer_email}</span>
                </a>
              )}
            </div>

            {/* Service */}
            <div className="text-xs sm:text-sm font-medium text-gray-900">
              {rdv.service_name}
              {typeof rdv.service_duration_minutes === 'number' &&
                rdv.service_duration_minutes > 0 && (
                  <span className="text-[10px] sm:text-xs text-gray-500 font-normal ml-2">
                    ({rdv.service_duration_minutes} min)
                  </span>
                )}
            </div>

            {/* Staff assigné */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                {rdv.staff_member_name ? (
                  <>
                    {(() => {
                      const color = getStaffColor(rdv.staff_member_id)
                      const initials = rdv.staff_member_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      return (
                        <div className={`w-5 h-5 rounded-full ${color.bg} border ${color.border} ${color.text} flex items-center justify-center font-medium text-[10px]`}>
                          {initials}
                        </div>
                      )
                    })()}
                    <span className="text-gray-900 font-medium">{rdv.staff_member_name}</span>
                  </>
                ) : (
                  <>
                    <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Non assigné</span>
                  </>
                )}
              </div>
              
              {/* Dropdown réassignation staff (uniquement si pending ou accepted) */}
              {onAssignStaff && staffMembers.length > 1 && 
               (rdv.status === 'pending' || rdv.status === 'accepted') && (
                <button
                  onClick={() => onAssignStaff(rdv.id)}
                  disabled={isUpdating}
                  className="text-[11px] sm:text-xs text-primary hover:text-primary/80 underline disabled:opacity-50"
                >
                  Réassigner
                </button>
              )}
            </div>

            {/* Message */}
            {rdv.message && (
              <div className="pt-2 border-t border-gray-100 flex gap-2 text-xs sm:text-sm text-gray-700">
                <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="break-words">{rdv.message}</span>
              </div>
            )}
          </div>

          {/* ===== ACTIONS (Boutons - empilés en bas sur mobile, colonne droite sur desktop) ===== */}
          <div className="flex sm:flex-col gap-2 w-full sm:w-auto items-stretch sm:items-end shrink-0">

            {/* Confirmé */}
            {rdv.status === 'accepted' && (
              <>
                {onEdit && (
                  <button
                    onClick={() => onEdit(rdv)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                )}

                {onCancel && (
                  <>
                    {!showCancelConfirm ? (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 text-xs font-medium rounded-md hover:bg-red-50"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        <span>Annuler</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleCancel}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md"
                      >
                        <CheckIcon className="w-4 h-4" />
                        <span>Confirmer</span>
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* En attente admin (nouveau RDV) */}
            {rdv.status === 'pending' && onAccept && onReject && (
              <>
                <button
                  onClick={() => onAccept(rdv.id, 'accepted')}
                  disabled={isUpdating}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>Accepter</span>
                </button>

                {!showRejectConfirm ? (
                  <button
                    onClick={() => setShowRejectConfirm(true)}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span>Refuser</span>
                  </button>
                ) : (
                  <button
                    onClick={handleReject}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-red-600 text-white text-xs font-medium rounded-md"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>Confirmer</span>
                  </button>
                )}
              </>
            )}

            {/* En attente client (validation modification) - UNIQUEMENT si pas de proposed_* */}
            {rdv.status === 'pending' && (!onAccept || !onReject) && !rdv.proposed_date && !rdv.proposed_start_time && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                <p className="font-medium">En attente de validation client</p>
                <p className="text-blue-600 mt-0.5">Le client doit accepter/refuser</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </motion.div>
  )
}

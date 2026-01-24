'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FaTimes,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaClock,
  FaEuroSign,
  FaCalendar,
  FaStickyNote,
  FaUserFriends,
} from 'react-icons/fa'

import type { AppointmentWithDetails } from '@/types/appointment'
import CancelAppointmentModal from './../CancelAppointmentModal'
import ReassignAppointmentModal from './ReassignAppointmentModal'
import { getStaffColor } from './TimeGrid'

interface AppointmentDetailModalProps {
  appointment: AppointmentWithDetails | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (appointment: AppointmentWithDetails) => void
  onCancel?: (id: string) => void
  onAccept?: (id: string) => void
  onRefuse?: (id: string) => void
  onReassignSuccess?: () => void
}

export default function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
  onEdit,
  onCancel,
  onAccept,
  onRefuse,
  onReassignSuccess,
}: AppointmentDetailModalProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [reassignModalOpen, setReassignModalOpen] = useState(false)

  if (!appointment) return null

  const statusConfig = {
    accepted: { label: 'Confirmé', color: 'bg-blue-100 text-blue-800' },
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    refused: { label: 'Refusé', color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-800' },
  }

  const status = statusConfig[appointment.status]

  return (
    <>
      {/* ===== MODALE PRINCIPALE ===== */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-bold">Détails RDV</h2>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <FaTimes />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Client */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                      Client
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <FaUser className="text-gray-400" />
                        <span className="font-medium">
                          {appointment.customer_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <FaEnvelope className="text-gray-400" />
                        {appointment.customer_email ? (
                          <a
                            href={`mailto:${appointment.customer_email}`}
                            className="text-primary"
                          >
                            {appointment.customer_email}
                          </a>
                        ) : (
                          <span className="italic text-gray-500">
                            Non renseigné
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <FaPhone className="text-gray-400" />
                        {appointment.customer_phone ? (
                          <a
                            href={`tel:${appointment.customer_phone}`}
                            className="text-primary"
                          >
                            {appointment.customer_phone}
                          </a>
                        ) : (
                          <span className="italic text-gray-500">
                            Non renseigné
                          </span>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Rendez-vous */}
                  <section className="border-t pt-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                      Rendez-vous
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <FaCalendar className="text-gray-400" />
                        <span className="capitalize">
                          {format(
                            new Date(appointment.start_time),
                            'EEEE d MMMM yyyy',
                            { locale: fr }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <FaClock className="text-gray-400" />
                        <span>
                          {format(
                            new Date(appointment.start_time),
                            'HH:mm'
                          )}{' '}
                          –{' '}
                          {format(
                            new Date(appointment.end_time),
                            'HH:mm'
                          )}
                          <span className="text-gray-500 ml-2">
                            ({appointment.service_duration} min)
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Nouvelle date/heure proposée */}
                    {((appointment as any).proposed_date || (appointment as any).proposed_start_time) && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <p className="text-sm font-semibold text-amber-800 mb-2">→ Nouvelle date demandée par le client :</p>
                        <div className="space-y-2">
                          {(appointment as any).proposed_date && (
                            <div className="flex items-center gap-3">
                              <FaCalendar className="text-amber-600" />
                              <span className="capitalize font-medium text-amber-900">
                                {format(
                                  new Date((appointment as any).proposed_date),
                                  'EEEE d MMMM yyyy',
                                  { locale: fr }
                                )}
                              </span>
                            </div>
                          )}
                          {(appointment as any).proposed_start_time && (
                            <div className="flex items-center gap-3">
                              <FaClock className="text-amber-600" />
                              <span className="font-medium text-amber-900">
                                {(appointment as any).proposed_start_time.substring(0, 5)}
                                {appointment.service_duration && (
                                  <>
                                    {' – '}
                                    {format(
                                      new Date(`2000-01-01T${(appointment as any).proposed_start_time}`).getTime() + appointment.service_duration * 60000,
                                      'HH:mm'
                                    )}
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Service */}
                  <section className="border-t pt-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                      Service
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 flex justify-between">
                      <span className="font-semibold">
                        {appointment.service_name}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-primary">
                        <FaEuroSign />
                        {appointment.service_price}
                      </span>
                    </div>
                  </section>

                  {/* Staff assigné - Step 7.2 */}
                  {appointment.staff_member_name && (
                    <section className="border-t pt-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <FaUserFriends />
                        Coiffeur assigné
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const staffId = (appointment as any).staff_member_id
                            const color = getStaffColor(staffId)
                            const initials = appointment.staff_member_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                            return (
                              <div className={`w-10 h-10 rounded-full ${color.bg} border-2 ${color.border} ${color.text} flex items-center justify-center font-medium text-sm`}>
                                {initials}
                              </div>
                            )
                          })()}
                          <span className="font-medium">{appointment.staff_member_name}</span>
                        </div>
                        {(appointment.status === 'pending' || appointment.status === 'accepted') && (
                          <button
                            onClick={() => setReassignModalOpen(true)}
                            className="text-sm text-primary hover:underline"
                          >
                            Réassigner
                          </button>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Notes */}
                  {appointment.notes && (
                    <section className="border-t pt-6">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <FaStickyNote />
                        Notes
                      </h3>
                      <p className="bg-yellow-50 p-4 rounded-lg italic text-gray-700">
                        {appointment.notes}
                      </p>
                    </section>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t px-4 sm:px-6 py-4 flex flex-wrap gap-2 justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {/* Boutons Accepter/Refuser pour tous les RDV pending */}
                    {appointment.status === 'pending' && (
                      <div className="flex gap-2">
                        {onAccept && (
                          <button
                            onClick={async () => {
                              await onAccept(appointment.id)
                              onClose()
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90"
                          >
                            Accepter
                          </button>
                        )}

                        {onRefuse && (
                          <button
                            onClick={async () => {
                              await onRefuse(appointment.id)
                              onClose()
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
                          >
                            Refuser
                          </button>
                        )}

                      </div>
                    )}



                    {onEdit && appointment.status === 'accepted' && (
                      <button
                        onClick={() => onEdit(appointment)}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                      >
                        Modifier
                      </button>
                    )}

                    {onCancel &&
                      appointment.status === 'accepted' && (
                        <button
                          onClick={() => setCancelModalOpen(true)}
                          className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50"
                        >
                          Annuler RDV
                        </button>
                      )}
                  </div>

                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 rounded-lg text-sm"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== MODALE ANNULATION ===== */}
      <CancelAppointmentModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={() => {
          if (!appointment || !onCancel) return
          onCancel(appointment.id)
          setCancelModalOpen(false)
          onClose()
        }}
      />

      {/* ===== MODALE RÉASSIGNATION - Step 7.2 ===== */}
      <ReassignAppointmentModal
        isOpen={reassignModalOpen}
        appointmentId={appointment?.id || null}
        currentStaffName={appointment?.staff_member_name}
        onClose={() => setReassignModalOpen(false)}
        onSuccess={() => {
          setReassignModalOpen(false)
          if (onReassignSuccess) {
            onReassignSuccess()
          }
          onClose()
        }}
      />
    </>
  )
}

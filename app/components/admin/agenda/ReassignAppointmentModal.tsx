'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  UserGroupIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { getStaffColor } from './TimeGrid'

interface AvailableStaff {
  staff_id: string
  staff_name: string
  is_original: boolean
}

interface ReassignAppointmentModalProps {
  isOpen: boolean
  appointmentId: string | null
  currentStaffName?: string
  onClose: () => void
  onSuccess: () => void
}

export default function ReassignAppointmentModal({
  isOpen,
  appointmentId,
  currentStaffName,
  onClose,
  onSuccess,
}: ReassignAppointmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Charger les staffs disponibles
  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchAvailableStaff()
    } else {
      // Reset state
      setAvailableStaff([])
      setSelectedStaffId(null)
      setError(null)
      setSuccess(null)
    }
  }, [isOpen, appointmentId])

  const fetchAvailableStaff = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/api/admin/reassign-appointment', {
        params: { appointment_id: appointmentId }
      })

      if (response.data.success) {
        setAvailableStaff(response.data.data.available_staff || [])
      } else {
        setError(response.data.error || 'Erreur lors du chargement')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleReassign = async (staffId?: string) => {
    try {
      setReassigning(true)
      setError(null)

      const response = await axios.post('/api/admin/reassign-appointment', {
        appointment_id: appointmentId,
        new_staff_id: staffId || null // null = auto-assign
      })

      if (response.data.success) {
        setSuccess(response.data.data.message)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(response.data.error || 'Erreur lors de la réassignation')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la réassignation')
    } finally {
      setReassigning(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="w-6 h-6 text-primary" />
                  <h2 className="text-lg font-bold">Réassigner le rendez-vous</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Info staff actuel */}
                {currentStaffName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      Actuellement assigné à : <strong>{currentStaffName}</strong>
                    </p>
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-gray-500 mt-3">Recherche des staffs disponibles...</p>
                  </div>
                )}

                {/* Erreur */}
                {error && !success && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Succès */}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                )}

                {/* Liste des staffs disponibles */}
                {!loading && !success && availableStaff.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Membres disponibles pour ce créneau :
                    </p>
                    <div className="space-y-2">
                      {availableStaff.map((staff) => {
                        const color = getStaffColor(staff.staff_id)
                        const initials = staff.staff_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                        
                        return (
                        <button
                          key={staff.staff_id}
                          onClick={() => setSelectedStaffId(staff.staff_id)}
                          disabled={reassigning}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            selectedStaffId === staff.staff_id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          } disabled:opacity-50`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${color.bg} border-2 ${color.border} ${color.text} flex items-center justify-center font-medium text-sm`}>
                              {initials}
                            </div>
                            <span className="font-medium">{staff.staff_name}</span>
                          </div>
                          {selectedStaffId === staff.staff_id && (
                            <CheckCircleIcon className="w-5 h-5 text-primary" />
                          )}
                        </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Aucun staff disponible */}
                {!loading && !success && availableStaff.length === 0 && !error && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800">Aucun membre disponible</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Aucun autre membre de l'équipe n'est disponible pour ce créneau.
                          Vous pouvez annuler ce rendez-vous ou le reprogrammer à une autre date.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!success && (
                <div className="border-t px-6 py-4 flex flex-wrap gap-2 justify-between bg-gray-50">
                  <div className="flex gap-2">
                    {/* Bouton réassignation auto */}
                    {availableStaff.length > 0 && (
                      <button
                        onClick={() => handleReassign()}
                        disabled={reassigning || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
                      >
                        <ArrowPathIcon className={`w-4 h-4 ${reassigning ? 'animate-spin' : ''}`} />
                        Réassigner auto
                      </button>
                    )}
                    
                    {/* Bouton réassignation manuelle */}
                    {selectedStaffId && (
                      <button
                        onClick={() => handleReassign(selectedStaffId)}
                        disabled={reassigning || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                      >
                        {reassigning ? 'Réassignation...' : 'Réassigner à ce membre'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    disabled={reassigning}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

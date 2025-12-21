'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa'

interface CancelAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export default function CancelAppointmentModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: CancelAppointmentModalProps) {
  return (
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
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="flex items-center gap-2 text-red-600">
                  <FaExclamationTriangle />
                  <h2 className="font-semibold">Annuler le rendez-vous</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 py-4 text-sm text-gray-700 space-y-3">
                <p>
                  Êtes-vous sûr de vouloir <strong>annuler ce rendez-vous</strong> ?
                </p>
                <p className="text-gray-500">
                  Les créneaux correspondants seront automatiquement libérés.
                </p>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 text-sm font-medium"
                  disabled={isLoading}
                >
                  Annuler
                </button>

                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Annulation…' : 'Confirmer'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

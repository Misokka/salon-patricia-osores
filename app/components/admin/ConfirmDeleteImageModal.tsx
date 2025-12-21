'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfirmDeleteImageModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title?: string
  message?: string
  isDeleting?: boolean
}

export default function ConfirmDeleteImageModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Supprimer l\'image',
  message = 'Êtes-vous sûr de vouloir supprimer cette image ? Cette action est irréversible.',
  isDeleting = false
}: ConfirmDeleteImageModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={onCancel}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-md w-full mx-3 sm:mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon + Title */}
              <div className="flex items-start gap-3 sm:gap-4 mb-4">
                <div className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 sm:w-6 h-5 sm:h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
                    {title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    {message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end mt-4 sm:mt-6">
                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

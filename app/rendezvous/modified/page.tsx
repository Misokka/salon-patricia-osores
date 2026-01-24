'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaCheckCircle, FaClock } from 'react-icons/fa'
import salonConfig from '@/config/salon.config'

function ModifiedAppointmentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requiresApproval = searchParams.get('requiresApproval') === 'true'

  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
      >
        {requiresApproval ? (
          <>
            <FaClock className="text-amber-500 text-5xl mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Demande envoyée !</h1>
            <p className="text-gray-600 mb-6">
              Votre demande de modification a été envoyée au salon. Vous recevrez un email dès que votre nouveau créneau sera confirmé.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>En attente de validation</strong><br />
                Le salon va vérifier la disponibilité et vous confirmera rapidement.
              </p>
            </div>
          </>
        ) : (
          <>
            <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Rendez-vous modifié !</h1>
            <p className="text-gray-600 mb-6">
              Votre rendez-vous a été modifié avec succès. Vous recevrez un email de confirmation sous peu.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                <strong>Modification confirmée</strong><br />
                Votre nouveau créneau est réservé.
              </p>
            </div>
          </>
        )}

        <button
          onClick={() => router.push('/')}
          className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium mb-3"
        >
          Retour à l'accueil
        </button>

        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Besoin d'aide ? Contactez-nous au{' '}
            <a href={`tel:${salonConfig.contact.phoneLink}`} className="text-primary hover:underline">
              {salonConfig.contact.phoneDisplay}
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function ModifiedAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-light flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ModifiedAppointmentContent />
    </Suspense>
  )
}

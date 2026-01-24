'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaCalendar, FaClock, FaCut, FaEuroSign, FaEdit, FaTrash, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import salonConfig from '@/config/salon.config'

interface AppointmentData {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  service_id: string
  service_name: string
  service_duration: number
  service_price: number
  appointment_date: string
  start_time: string
  status: string
  staff_member_name?: string
}

function ManageAppointmentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const id = searchParams.get('id')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!id || !token) {
      setError('Lien invalide. Veuillez utiliser le lien reçu par email.')
      setLoading(false)
      return
    }

    fetchAppointment()
  }, [id, token])

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/rendezvous/manage?id=${id}&token=${token}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Impossible de récupérer les informations du rendez-vous')
        return
      }

      setAppointment(result.data)
    } catch (err) {
      setError('Erreur lors du chargement des informations')
    } finally {
      setLoading(false)
    }
  }

  const handleModify = () => {
    if (!appointment) return
    // Rediriger vers la page de modification dédiée
    router.push(`/rendezvous/modify?id=${id}&token=${token}`)
  }

  const handleCancelConfirm = async () => {
    if (!id || !token) return

    setCancelling(true)
    setError(null)

    try {
      const response = await fetch('/api/rendezvous/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id, token }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Erreur lors de l\'annulation')
        return
      }

      // Redirection vers page de confirmation d'annulation
      router.push(`/rendezvous/cancelled?id=${id}`)
    } catch (err) {
      setError('Erreur lors de l\'annulation. Veuillez réessayer.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <FaTimesCircle className="text-red-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error || 'Rendez-vous introuvable'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  // Si le RDV est déjà annulé
  if (appointment.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <FaTimesCircle className="text-gray-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Rendez-vous annulé</h1>
          <p className="text-gray-600 mb-6">Ce rendez-vous a déjà été annulé.</p>
          <button
            onClick={() => router.push('/rendezvous')}
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Prendre un nouveau rendez-vous
          </button>
        </div>
      </div>
    )
  }

  const formattedDate = format(parseISO(appointment.appointment_date), 'EEEE d MMMM yyyy', { locale: fr })
  const formattedTime = appointment.start_time.substring(0, 5)

  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary text-white p-6 text-center">
          <h1 className="text-2xl font-bold">Gérer mon rendez-vous</h1>
          <p className="text-sm mt-2 opacity-90">{salonConfig.identity.name}</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Bonjour <strong>{appointment.customer_name}</strong>, voici les détails de votre rendez-vous :
          </p>

          {/* Statut */}
          {appointment.status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <FaClock className="text-amber-600" />
                <p className="text-sm text-amber-800">
                  <strong>En attente de validation</strong> - Vous recevrez une confirmation par email
                </p>
              </div>
            </div>
          )}

          {appointment.status === 'accepted' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                <p className="text-sm text-green-800">
                  <strong>Rendez-vous confirmé</strong>
                </p>
              </div>
            </div>
          )}

          {/* Détails du RDV */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <FaCalendar className="text-primary text-lg" />
              <div>
                <p className="text-xs text-gray-600">Date</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <FaClock className="text-primary text-lg" />
              <div>
                <p className="text-xs text-gray-600">Heure</p>
                <p className="text-sm font-semibold text-gray-900">{formattedTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <FaCut className="text-primary text-lg" />
              <div>
                <p className="text-xs text-gray-600">Service</p>
                <p className="text-sm font-semibold text-gray-900">{appointment.service_name}</p>
                <p className="text-xs text-gray-500">{appointment.service_duration} minutes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FaEuroSign className="text-primary text-lg" />
              <div>
                <p className="text-xs text-gray-600">Prix</p>
                <p className="text-sm font-semibold text-gray-900">{appointment.service_price} €</p>
              </div>
            </div>

            {appointment.staff_member_name && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {appointment.staff_member_name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs text-gray-600">Coiffeur</p>
                  <p className="text-sm font-semibold text-gray-900">{appointment.staff_member_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleModify}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <FaEdit />
              Modifier le rendez-vous
            </button>

            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full bg-white border-2 border-red-500 text-red-600 py-3 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <FaTrash />
              Annuler le rendez-vous
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Besoin d'aide ? Contactez-nous au{' '}
            <a href={`tel:${salonConfig.contact.phoneLink}`} className="text-primary hover:underline">
              {salonConfig.contact.phoneDisplay}
            </a>
          </p>
        </div>
      </motion.div>

      {/* Modal de confirmation d'annulation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmer l'annulation</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Retour
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Annulation...
                  </>
                ) : (
                  'Confirmer'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default function ManageAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <ManageAppointmentContent />
    </Suspense>
  )
}

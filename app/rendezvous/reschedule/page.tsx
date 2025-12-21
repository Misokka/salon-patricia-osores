'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaCalendar, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import salonConfig from '@/config/salon.config'

interface RescheduleData {
  id: string
  nom: string
  service: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
}

function RescheduleClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [data, setData] = useState<RescheduleData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const rdvId = searchParams.get('id')
  const action = searchParams.get('validate')

  useEffect(() => {
    if (!rdvId || action !== 'reschedule') {
      setError('Lien invalide')
      setLoading(false)
      return
    }

    fetchRescheduleData()
  }, [rdvId, action])

  const fetchRescheduleData = async () => {
    try {
      const response = await fetch(`/api/rendezvous/reschedule-info?id=${rdvId}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Impossible de récupérer les informations')
        return
      }

      setData(result.data)
    } catch (err) {
      setError('Erreur lors du chargement des informations')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!rdvId) return

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/rendezvous/reschedule-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rdvId, accepted: true }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Erreur lors de la validation')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Erreur lors de la validation. Veuillez réessayer.')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rdvId) return

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/rendezvous/reschedule-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rdvId, accepted: false }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Erreur lors du refus')
        return
      }

      setCancelled(true)
    } catch (err) {
      setError('Erreur lors du refus. Veuillez réessayer.')
    } finally {
      setProcessing(false)
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

  if (error && !data) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <FaTimesCircle className="text-red-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
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

  if (success) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Rendez-vous confirmé !</h1>
          <p className="text-gray-600 mb-6">
            Votre rendez-vous a été modifié avec succès. Vous recevrez un email de confirmation sous peu.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Nouveau rendez-vous :</p>
            <p className="text-lg font-semibold text-primary">{data?.newDate} à {data?.newTime}</p>
            <p className="text-sm text-gray-600 mt-2">{data?.service}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Retour à l'accueil
          </button>
        </motion.div>
      </div>
    )
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <FaTimesCircle className="text-gray-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Rendez-vous annulé</h1>
          <p className="text-gray-600 mb-6">
            Le nouveau créneau ne vous convenait pas. Votre rendez-vous a été annulé.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Vous pouvez prendre un nouveau rendez-vous à tout moment.
          </p>
          <button
            onClick={() => router.push('/rendezvous')}
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Prendre un nouveau rendez-vous
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Retour à l'accueil
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary text-white p-6 text-center">
          <h1 className="text-2xl font-bold">Modification de rendez-vous</h1>
          <p className="text-sm mt-2 opacity-90">{salonConfig.identity.name}</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Bonjour <strong>{data?.nom}</strong>, nous souhaitons modifier votre rendez-vous :
          </p>

          {/* Ancien créneau */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 relative">
            <div className="absolute top-2 right-2">
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Ancien</span>
            </div>
            <div className="flex items-center gap-3 mb-2 opacity-60 line-through">
              <FaCalendar className="text-gray-400" />
              <span className="text-gray-600">{data?.oldDate}</span>
            </div>
            <div className="flex items-center gap-3 opacity-60 line-through">
              <FaClock className="text-gray-400" />
              <span className="text-gray-600">{data?.oldTime}</span>
            </div>
          </div>

          {/* Nouveau créneau */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6 relative">
            <div className="absolute top-2 right-2">
              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Nouveau</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <FaCalendar className="text-green-600" />
              <span className="text-gray-900 font-semibold">{data?.newDate}</span>
            </div>
            <div className="flex items-center gap-3">
              <FaClock className="text-green-600" />
              <span className="text-gray-900 font-semibold">{data?.newTime}</span>
            </div>
            <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-green-200">
              {data?.service}
            </p>
          </div>

          {/* Message d'information */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Important :</strong> Merci de confirmer si ce nouveau créneau vous convient.
            </p>
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
              onClick={handleAccept}
              disabled={processing}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FaCheckCircle />
                  Accepter le nouveau créneau
                </>
              )}
            </button>

            <button
              onClick={handleReject}
              disabled={processing}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FaTimesCircle />
                  Refuser (annuler le rendez-vous)
                </>
              )}
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
    </div>
  )
}

export default function RescheduleValidationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-light flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      }
    >
      <RescheduleClient />
    </Suspense>
  )
}

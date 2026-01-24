'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaCheckCircle } from 'react-icons/fa'
import Link from 'next/link'

function CancelledContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaCheckCircle className="text-4xl text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Rendez-vous annulé</h1>
        
        <p className="text-gray-600 mb-6">
          Votre rendez-vous a été annulé avec succès. Le salon a été notifié de votre annulation.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Si vous souhaitez reprendre rendez-vous, n'hésitez pas à revenir sur notre site.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block bg-brand-gold text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-gold-dark transition-colors"
        >
          Retour à l'accueil
        </Link>
      </motion.div>
    </div>
  )
}

export default function CancelledPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <CancelledContent />
    </Suspense>
  )
}

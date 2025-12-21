'use client'

import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'

import ConfirmDeleteImageModal from './ConfirmDeleteImageModal'
import About from '@/app/components/About'

/* ----------------------------------------
   Types
---------------------------------------- */

type FeedbackMessage = {
  type: 'success' | 'error'
  text: string
}

/* ----------------------------------------
   Component
---------------------------------------- */

export default function AboutImageAdmin() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [message, setMessage] = useState<FeedbackMessage | null>(null)

  const [showPreview, setShowPreview] = useState(false)

  /* ----------------------------------------
     Lifecycle
  ---------------------------------------- */

  useEffect(() => {
    loadImage()
  }, [])

  /* ----------------------------------------
     Helpers
  ---------------------------------------- */

  const showMessage = (type: FeedbackMessage['type'], text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const extractStoragePath = (url: string): string => {
    const parsed = new URL(url)
    const path = parsed.pathname.split('/storage/v1/object/public/salon-images/')[1]
    if (!path) throw new Error('Chemin storage invalide')
    return path
  }

  /* ----------------------------------------
     API calls
  ---------------------------------------- */

  const loadImage = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/api/admin/about/image')
      setImageUrl(res.data?.data?.imageUrl ?? null)
    } catch (error) {
      console.error('Erreur chargement image About:', error)
      showMessage('error', 'Impossible de charger l’image')
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File) => {
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'about')

      const uploadRes = await apiClient.post('/api/admin/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (!uploadRes.data.success) {
        throw new Error('Upload échoué')
      }

      const publicUrl = uploadRes.data.data.publicUrl

      await apiClient.patch('/api/admin/about/image', {
        imageUrl: publicUrl,
      })

      setImageUrl(publicUrl)
      showMessage('success', 'Image mise à jour avec succès')
    } catch (error: any) {
      console.error('Erreur upload image About:', error)
      showMessage('error', error.response?.data?.error || 'Erreur lors de l’upload')
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async () => {
    if (!imageUrl) return

    setIsDeleting(true)

    try {
      const path = extractStoragePath(imageUrl)

      await apiClient.patch('/api/admin/about/image', { imageUrl: null })
      await apiClient.delete(`/api/admin/delete-image?path=${encodeURIComponent(path)}`)

      setImageUrl(null)
      showMessage('success', 'Image supprimée')
      setShowDeleteModal(false)
    } catch (error: any) {
      console.error('Erreur suppression image About:', error)
      showMessage('error', error.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  /* ----------------------------------------
     Loading
  ---------------------------------------- */

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    )
  }

  /* ----------------------------------------
     Render
  ---------------------------------------- */

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Image de la section “À propos”
        </h1>
        <p className="text-sm text-gray-600">
          Cette image apparaît sur la page d’accueil à côté de la présentation du salon.
        </p>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`mb-6 rounded-lg p-4 text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image card */}
      <div className="max-w-2xl mx-auto">
        <div className="relative h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg group">
          {imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt="Image À propos du salon"
                fill
                className="object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center gap-3">
                <label className="cursor-pointer bg-white text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm">
                  <PhotoIcon className="w-5 h-5" />
                  Remplacer
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadImage(file)
                    }}
                  />
                </label>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={uploading}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                >
                  <TrashIcon className="w-5 h-5" />
                  Supprimer
                </button>
              </div>
            </>
          ) : (
            <label className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer text-primary/40 hover:text-primary transition-colors">
              <PlusIcon className="w-14 h-14" />
              <span className="text-lg font-semibold">Ajouter une image</span>
              <span className="text-xs text-gray-500 text-center">
                JPEG, PNG ou WEBP — max 5 Mo
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file)
                }}
              />
            </label>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            </div>
          )}
        </div>

        {/* Actions */}

        {/* Tips */}
        <div className="mt-10 bg-blue-50 text-blue-800 rounded-lg p-4 text-sm">
          <p className="font-medium mb-2">ℹ️ Conseils</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ratio recommandé : 3:2 (paysage)</li>
            <li>Image représentative du salon</li>
            <li>Résolution minimale : 800×533 px</li>
          </ul>
        </div>
        

        {/* Preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="mt-10"
            >
              {/* Label */}
              <div className="max-w-6xl mx-auto mb-4 text-sm text-gray-500 px-4">
                Aperçu du rendu réel sur le site
              </div>

              {/* Full width background (comme le site) */}
              <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-light">
                {/* Contenu centré comme sur le site */}
                <div className="max-w-none">
                  <About />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        
      </div>

      <div className="align-center mt-6 flex justify-center">
          <button
            onClick={() => setShowPreview(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            {showPreview ? (
              <>
                <EyeSlashIcon className="w-5 h-5" />
                Masquer l’aperçu
              </>
            ) : (
              <>
                <EyeIcon className="w-5 h-5" />
                Voir un aperçu
              </>
            )}
          </button>
        </div>

      {/* Delete confirmation */}
      <ConfirmDeleteImageModal
        isOpen={showDeleteModal}
        onConfirm={deleteImage}
        onCancel={() => setShowDeleteModal(false)}
        title="Supprimer l’image À propos"
        message="Êtes-vous sûr de vouloir supprimer cette image ? Cette action est irréversible."
        isDeleting={isDeleting}
      />
    </div>
  )
}

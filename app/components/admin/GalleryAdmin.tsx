'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  EyeIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import ConfirmDeleteImageModal from './ConfirmDeleteImageModal'
import Gallery from '@/app/components/Gallery'

/* ----------------------------------------
   Types
---------------------------------------- */

type GalleryImage = {
  id: string
  image_url: string
  alt_text: string | null
  service_id: string | null
  order: number
  created_at: string
}

type Service = {
  id: string
  name: string
}

type FeedbackMessage = {
  type: 'success' | 'error'
  text: string
}

const MAX_IMAGES = 6

/* ----------------------------------------
   Component
---------------------------------------- */

export default function GalleryAdmin() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [message, setMessage] = useState<FeedbackMessage | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null)

  const [showPreview, setShowPreview] = useState(false)

  /* ----------------------------------------
     Lifecycle
  ---------------------------------------- */

  useEffect(() => {
    loadInitialData()
  }, [])

  /* ----------------------------------------
     Helpers
  ---------------------------------------- */

  const showMessage = (type: FeedbackMessage['type'], text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const extractStoragePath = (url: string) => {
    const parsed = new URL(url)
    return parsed.pathname.split('/storage/v1/object/public/salon-images/')[1]
  }

  /* ----------------------------------------
     Data loading
  ---------------------------------------- */

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [imagesRes, servicesRes] = await Promise.all([
        axios.get('/api/admin/gallery/images'),
        axios.get('/api/admin/services'),
      ])
      setImages(imagesRes.data?.data ?? [])
      setServices(servicesRes.data?.data ?? [])
    } catch {
      showMessage('error', 'Impossible de charger la galerie')
    } finally {
      setLoading(false)
    }
  }

  /* ----------------------------------------
     API actions
  ---------------------------------------- */

  const updateImageService = async (
    imageId: string,
    serviceId: string | null
  ) => {
    try {
      await axios.patch('/api/admin/gallery/images', {
        id: imageId,
        serviceId,
      })
      showMessage('success', 'Service associé mis à jour')
      await loadInitialData()
    } catch {
      showMessage('error', 'Erreur lors de la mise à jour du service')
    }
  }

  const uploadImage = async (file: File) => {
    if (images.length >= MAX_IMAGES) {
      showMessage('error', `Maximum ${MAX_IMAGES} images atteint`)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'gallery')

      const uploadRes = await axios.post('/api/admin/upload-image', formData)

      await axios.post('/api/admin/gallery/images', {
        imageUrl: uploadRes.data.data.publicUrl,
        altText: `Réalisation ${images.length + 1}`,
        serviceId: null,
      })

      showMessage('success', 'Image ajoutée')
      await loadInitialData()
    } catch {
      showMessage('error', 'Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  const replaceImage = async (image: GalleryImage, file: File) => {
    setUploading(true)
    try {
      const oldPath = extractStoragePath(image.image_url)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'gallery')

      const uploadRes = await axios.post('/api/admin/upload-image', formData)

      await axios.patch('/api/admin/gallery/images', {
        id: image.id,
        imageUrl: uploadRes.data.data.publicUrl,
      })

      await axios.delete(
        `/api/admin/delete-image?path=${encodeURIComponent(oldPath)}`
      )

      showMessage('success', 'Image remplacée')
      await loadInitialData()
    } catch {
      showMessage('error', 'Erreur remplacement')
    } finally {
      setUploading(false)
    }
  }

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return
    setIsDeleting(true)

    try {
      const path = extractStoragePath(imageToDelete.image_url)
      await axios.delete(`/api/admin/gallery/images?id=${imageToDelete.id}`)
      await axios.delete(
        `/api/admin/delete-image?path=${encodeURIComponent(path)}`
      )

      showMessage('success', 'Image supprimée')
      setShowDeleteModal(false)
      setImageToDelete(null)
      await loadInitialData()
    } catch {
      showMessage('error', 'Erreur suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  /* ----------------------------------------
     Slots
  ---------------------------------------- */

  const slots = useMemo(
    () => Array.from({ length: MAX_IMAGES }, (_, i) => images[i] ?? null),
    [images]
  )

  /* ----------------------------------------
     Loading
  ---------------------------------------- */

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-primary mx-auto rounded-full" />
      </div>
    )
  }

  /* ----------------------------------------
     Render
  ---------------------------------------- */

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Galerie – Réalisations
        </h1>
        <p className="text-sm text-gray-600">
          Ces images sont affichées sur la page d’accueil du site.
        </p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`rounded-lg p-4 text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {slots.map((image, index) => (
          <div
            key={image?.id ?? index}
            className="relative h-44 sm:h-56 lg:h-64 rounded-xl bg-gray-100 shadow overflow-hidden group"
          >
            {image ? (
              <>
                <Image src={image.image_url} alt="" fill className="object-cover" />

                {/* Select service */}
                <div className="absolute bottom-2 left-2 right-2 z-20">
                  <div className="relative">
                    <select
                      value={image.service_id ?? ''}
                      onChange={e =>
                        updateImageService(
                          image.id,
                          e.target.value === '' ? null : e.target.value
                        )
                      }
                      className="w-full appearance-none rounded-lg bg-white/90 backdrop-blur border border-gray-200 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Aucun service associé</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center gap-3">
                  <label className="bg-white rounded-lg p-2 sm:px-3 sm:py-2 flex items-center gap-2 cursor-pointer text-sm">
                    <PhotoIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Remplacer</span>
                    <input
                      type="file"
                      hidden
                      onChange={e =>
                        e.target.files &&
                        replaceImage(image, e.target.files[0])
                      }
                    />
                  </label>

                  <button
                    onClick={() => {
                      setImageToDelete(image)
                      setShowDeleteModal(true)
                    }}
                    className="bg-red-600 text-white rounded-lg p-2 sm:px-3 sm:py-2 flex items-center gap-2 text-sm"
                  >
                    <TrashIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                </div>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center h-full cursor-pointer text-gray-400 hover:text-primary">
                <PlusIcon className="w-10 h-10" />
                Ajouter
                <input
                  type="file"
                  hidden
                  onChange={e =>
                    e.target.files && uploadImage(e.target.files[0])
                  }
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => setShowPreview(v => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          <EyeIcon className="w-5 h-5" />
          {showPreview ? 'Masquer l’aperçu' : 'Voir l’aperçu'}
        </button>
      </div>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="mt-12"
          >
            <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-white">
              <Gallery />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDeleteImageModal
        isOpen={showDeleteModal}
        onConfirm={confirmDeleteImage}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
        title="Supprimer l’image"
        message="Confirmer la suppression ?"
      />
    </div>
  )
}

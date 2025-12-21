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
} from '@heroicons/react/24/outline'
import ConfirmDeleteImageModal from './ConfirmDeleteImageModal'
import Services from '@/app/components/Services'

import type { ServiceWithImage } from '@/types/service'

export default function FeaturedServicesImagesAdmin() {
  const [services, setServices] = useState<ServiceWithImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingServiceId, setUploadingServiceId] = useState<string | null>(null)
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null)

  const [showPreview, setShowPreview] = useState(false)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<{
    serviceId: string
    imageId: string
    serviceName: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /* --------------------------------
     Fetch
  -------------------------------- */

  useEffect(() => {
    fetchFeaturedServices()
  }, [])

  const fetchFeaturedServices = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/api/admin/featured-services')
      setServices(res.data.data)
    } catch {
      showMessage('error', 'Erreur lors du chargement des services')
    } finally {
      setLoading(false)
    }
  }

  /* --------------------------------
     Helpers
  -------------------------------- */

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const formatDuration = (minutes: number) =>
    minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 || ''}`

  const formatPrice = (service: ServiceWithImage) => {
    if (service.price_type === 'quote') return 'Sur devis'
    if (service.price_type === 'from') return `À partir de ${service.price_value}€`
    return `${service.price_value}€`
  }

  /* --------------------------------
     Upload image
  -------------------------------- */

  const handleUploadImage = async (serviceId: string, file: File) => {
    try {
      setUploadingServiceId(serviceId)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('service_id', serviceId)
      formData.append('type', 'featured')

      const res = await apiClient.post('/api/admin/images', formData)

      setServices(prev =>
        prev.map(s => (s.id === serviceId ? { ...s, image: res.data.data } : s))
      )

      showMessage('success', 'Image ajoutée')
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Erreur upload')
    } finally {
      setUploadingServiceId(null)
      setActiveServiceId(null)
    }
  }

  /* --------------------------------
     Delete image
  -------------------------------- */

  const askDeleteImage = (service: ServiceWithImage) => {
    if (!service.image) return
    setImageToDelete({
      serviceId: service.id,
      imageId: service.image.id,
      serviceName: service.name,
    })
    setShowDeleteModal(true)
  }

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return

    try {
      setIsDeleting(true)
      await apiClient.delete(`/api/admin/images?imageId=${imageToDelete.imageId}`)

      setServices(prev =>
        prev.map(s => (s.id === imageToDelete.serviceId ? { ...s, image: null } : s))
      )

      showMessage('success', 'Image supprimée')
      setShowDeleteModal(false)
      setImageToDelete(null)
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Erreur suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  /* --------------------------------
     Loading
  -------------------------------- */

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    )
  }

  /* --------------------------------
     Render
  -------------------------------- */

  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Images des services mis en avant
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ces images sont affichées sur la page d’accueil.
          </p>
        </div>

        
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map(service => (
          <div key={service.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Image */}
            <div
              className="relative h-56 bg-gray-100 group"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setActiveServiceId(prev => (prev === service.id ? null : service.id))
                }
              }}
            >
              {service.image ? (
                <>
                  <Image
                    src={service.image.image_url}
                    alt={service.image.alt_text || service.name}
                    fill
                    className="object-cover"
                  />

                  {/* Desktop hover */}
                  <div className="absolute inset-0 hidden md:flex bg-black/0 group-hover:bg-black/60 transition items-center justify-center gap-3 pointer-events-none">
                    <label className="pointer-events-auto bg-white px-4 py-2 rounded-md flex gap-2 cursor-pointer text-sm">
                      <PhotoIcon className="w-5 h-5" />
                      Remplacer
                      <input
                        type="file"
                        hidden
                        disabled={uploadingServiceId === service.id}
                        onChange={e =>
                          e.target.files && handleUploadImage(service.id, e.target.files[0])
                        }
                      />
                    </label>

                    <button
                      onClick={() => askDeleteImage(service)}
                      className="pointer-events-auto bg-red-600 text-white px-4 py-2 rounded-md flex gap-2 text-sm"
                    >
                      <TrashIcon className="w-5 h-5" />
                      Supprimer
                    </button>
                  </div>

                  {/* Mobile tap */}
                  <AnimatePresence>
                    {activeServiceId === service.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex md:hidden items-center justify-center gap-4 bg-black/60 z-20"
                      >
                        <label className="bg-white/90 p-3 rounded-full shadow cursor-pointer">
                          <PhotoIcon className="w-6 h-6" />
                          <input
                            type="file"
                            hidden
                            disabled={uploadingServiceId === service.id}
                            onChange={e =>
                              e.target.files && handleUploadImage(service.id, e.target.files[0])
                            }
                          />
                        </label>

                        <button
                          onClick={() => askDeleteImage(service)}
                          className="bg-red-600 p-3 rounded-full shadow"
                        >
                          <TrashIcon className="w-6 h-6 text-white" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <label className="h-full flex flex-col items-center justify-center cursor-pointer text-primary/50 hover:text-primary">
                  <PlusIcon className="w-12 h-12" />
                  <span className="mt-2 font-medium">Ajouter une image</span>
                  <input
                    type="file"
                    hidden
                    disabled={uploadingServiceId === service.id}
                    onChange={e =>
                      e.target.files && handleUploadImage(service.id, e.target.files[0])
                    }
                  />
                </label>
              )}

              {uploadingServiceId === service.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-sm text-gray-600">{service.description}</p>

              <div className="mt-3 flex justify-between text-sm border-t pt-3">
                <span>{formatDuration(service.duration_minutes)}</span>
                <span className="font-semibold text-primary">
                  {formatPrice(service)}
                </span>
              </div>
            </div>
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

      {/* ===== APERÇU SITE ===== */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="mt-12"
          >
            <div className="max-w-6xl mx-auto mb-4 text-sm text-gray-500 px-4">
              Aperçu réel sur le site
            </div>

            <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-light">
              <Services />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <ConfirmDeleteImageModal
        isOpen={showDeleteModal}
        onConfirm={confirmDeleteImage}
        onCancel={() => {
          setShowDeleteModal(false)
          setImageToDelete(null)
        }}
        title="Supprimer l’image"
        message={`Supprimer l’image du service "${imageToDelete?.serviceName}" ?`}
        isDeleting={isDeleting}
      />
    </div>
  )
}

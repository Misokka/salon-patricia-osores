'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EyeSlashIcon,
  StarIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

import CategoryModal, { type CategoryFormData } from './CategoryModal'
import ServiceModal, { type ServiceFormData } from './ServiceModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import type { Service } from '@/types/service'

/* ==========================================================================
   TYPES
========================================================================== */

interface Category {
  id: string
  name: string
  color?: string
  position: number
}

/* ==========================================================================
   COMPONENT
========================================================================== */

export default function ServicesAdmin() {
  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Catégories repliées
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; data?: Category }>({
    isOpen: false,
  })

  const [serviceModal, setServiceModal] = useState<{
    isOpen: boolean
    data?: Service
    categoryId?: string
  }>({ isOpen: false })

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type?: 'category' | 'service'
    id?: string
    title?: string
    message?: string
  }>({ isOpen: false })

  const featuredServices = useMemo(() => services.filter(s => s.is_featured), [services])
  const featuredCount = featuredServices.length

  /* ==========================================================================
     FETCH
  ========================================================================== */

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [categoriesRes, servicesRes] = await Promise.all([
        axios.get(`/admin/service-categories`),
        axios.get(`/admin/services`),
      ])

      if (categoriesRes.data.success) setCategories(categoriesRes.data.data)
      if (servicesRes.data.success) setServices(servicesRes.data.data)
    } catch {
      showMessage('error', 'Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  /* ==========================================================================
     HELPERS
  ========================================================================== */

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId)
      return next
    })
  }

  const formatDuration = (minutes: number) =>
    minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 || ''}`

  const formatPrice = (service: Service) => {
    if (service.price_type === 'quote') return 'Sur devis'
    if (service.price_type === 'from') return `À partir de ${service.price_value}€`
    return `${service.price_value}€`
  }

  const getServicesByCategory = (categoryId: string) =>
    services
      .filter(s => s.category_id === categoryId && !s.is_featured) // évite doublons
      .sort((a, b) => a.position - b.position)

  /* ==========================================================================
     FEATURED (FAVORIS)
  ========================================================================== */

  const toggleFeatured = async (service: Service, value: boolean) => {
    if (value && featuredCount >= 3) {
      showMessage('error', 'Maximum 3 services mis en avant')
      return
    }

    try {
      const res = await axios.patch(`/admin/services`, {
        id: service.id,
        isFeatured: value,
      })

      if (res.data.success) {
        setServices(prev => prev.map(s => (s.id === service.id ? res.data.data : s)))
        showMessage('success', value ? 'Service mis en avant' : 'Service retiré des favoris')
      }
    } catch {
      showMessage('error', 'Erreur lors de la mise à jour')
    }
  }

  /* ==========================================================================
     CRUD — CATEGORIES
  ========================================================================== */

  const handleCreateCategory = async (data: CategoryFormData) => {
    try {
      setIsSubmitting(true)
      const res = await axios.post(`/admin/service-categories`, data)

      if (res.data.success) {
        setCategories(prev => [...prev, res.data.data])
        setCategoryModal({ isOpen: false })
        showMessage('success', 'Catégorie créée')
      } else {
        showMessage('error', 'Erreur lors de la création')
      }
    } catch {
      showMessage('error', 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCategory = async (id: string, data: CategoryFormData) => {
    try {
      setIsSubmitting(true)
      const res = await axios.patch(`admin/service-categories`, {
        id,
        ...data,
      })

      if (res.data.success) {
        setCategories(prev => prev.map(c => (c.id === id ? res.data.data : c)))
        setCategoryModal({ isOpen: false })
        showMessage('success', 'Catégorie mise à jour')
      } else {
        showMessage('error', 'Erreur lors de la mise à jour')
      }
    } catch {
      showMessage('error', 'Erreur lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDeleteCategory = async (id: string) => {
    try {
      setDeletingId(id)
      const res = await axios.delete(`/admin/service-categories?id=${id}`)

      if (res.data.success) {
        setCategories(prev => prev.filter(c => c.id !== id))
        setServices(prev => prev.filter(s => s.category_id !== id))
        showMessage('success', 'Catégorie supprimée')
      } else {
        showMessage('error', 'Erreur lors de la suppression')
      }
    } catch {
      showMessage('error', 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
      setDeleteModal({ isOpen: false })
    }
  }

  /* ==========================================================================
     CRUD — SERVICES
  ========================================================================== */

  const handleCreateService = async (data: ServiceFormData) => {
    if (data.isFeatured && featuredCount >= 3) {
      showMessage('error', 'Maximum 3 services mis en avant')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await axios.post(`/admin/services`, data)

      if (res.data.success) {
        setServices(prev => [...prev, res.data.data])
        setServiceModal({ isOpen: false })
        showMessage('success', 'Service créé')
      } else {
        showMessage('error', 'Erreur lors de la création')
      }
    } catch {
      showMessage('error', 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateService = async (id: string, data: ServiceFormData) => {
    if (data.isFeatured && featuredCount >= 3) {
      showMessage('error', 'Maximum 3 services mis en avant')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await axios.patch(`/admin/services`, {
        id,
        ...data,
      })

      if (res.data.success) {
        setServices(prev => prev.map(s => (s.id === id ? res.data.data : s)))
        setServiceModal({ isOpen: false })
        showMessage('success', 'Service mis à jour')
      } else {
        showMessage('error', 'Erreur lors de la mise à jour')
      }
    } catch {
      showMessage('error', 'Erreur lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDuplicateService = async (service: Service) => {
    const data: ServiceFormData = {
      name: `${service.name} (copie)`,
      description: service.description,
      categoryId: service.category_id,
      durationMinutes: service.duration_minutes,
      priceType: service.price_type,
      priceValue: service.price_value,
      isVisible: false,
      isFeatured: false,
    }

    try {
      const res = await axios.post(`/admin/services`, data)
      if (res.data.success) {
        setServices(prev => [...prev, res.data.data])
        showMessage('success', 'Service dupliqué')
      } else {
        showMessage('error', 'Erreur lors de la duplication')
      }
    } catch {
      showMessage('error', 'Erreur lors de la duplication')
    }
  }

  const confirmDeleteService = async (id: string) => {
    try {
      setDeletingId(id)
      const res = await axios.delete(`/admin/services?id=${id}`)

      if (res.data.success) {
        setServices(prev => prev.filter(s => s.id !== id))
        showMessage('success', 'Service supprimé')
      } else {
        showMessage('error', 'Erreur lors de la suppression')
      }
    } catch {
      showMessage('error', 'Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
      setDeleteModal({ isOpen: false })
    }
  }

  /* ==========================================================================
     RENDER
  ========================================================================== */

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* MESSAGE */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-lg border text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-red-100 text-red-700 border-red-200'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-sm text-gray-600">Gestion des catégories et services</p>
        </div>

        <button
          onClick={() => setCategoryModal({ isOpen: true })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          Ajouter une catégorie
        </button>
      </div>

      {/* ⭐ SECTION FAVORIS */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 bg-amber-50/60 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StarIcon className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Favoris</h2>
            <span className="text-xs text-gray-500">({featuredCount}/3)</span>
          </div>

          <p className="text-xs text-gray-500 hidden sm:block">
            Les 3 services mis en avant sur la page d’accueil
          </p>
        </div>

        {featuredServices.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 italic">Aucun service en favoris</div>
        ) : (
          <div className="divide-y">
            {featuredServices.map(service => (
              <div key={service.id} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{service.name}</span>
                    {!service.is_visible && <EyeSlashIcon className="w-4 h-4 text-gray-400" />}
                  </div>

                  {service.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                    <span>{formatDuration(service.duration_minutes)}</span>
                    <span className="font-medium text-gray-900">{formatPrice(service)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
  onClick={() => toggleFeatured(service, false)}
  title="Retirer des favoris"
  className="
    flex items-center justify-center
    px-2 py-1.5
    rounded-md
    bg-amber-100 text-amber-700
    hover:bg-amber-200 transition
  "
>
  <span className="text-xs font-medium">
    Retirer
  </span>
</button>



                  <button
                    onClick={() => setServiceModal({ isOpen: true, data: service })}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    aria-label="Modifier"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicateService(service)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    aria-label="Dupliquer"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      setDeleteModal({
                        isOpen: true,
                        type: 'service',
                        id: service.id,
                        title: 'Supprimer le service',
                        message: 'Cette action est irréversible.',
                      })
                    }
                    className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded"
                    aria-label="Supprimer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LISTE DES CATÉGORIES */}
      <div className="space-y-6">
        {categories
          .slice()
          .sort((a, b) => a.position - b.position)
          .map(category => {
            const categoryServices = getServicesByCategory(category.id)
            const collapsed = collapsedCategories.has(category.id)

            return (
              <div key={category.id} className="bg-white border rounded-lg overflow-hidden">
                {/* CATEGORY HEADER */}
                <div
                  onClick={() => toggleCategoryCollapse(category.id)}
                  className="cursor-pointer select-none border-l-4"
                  style={{ borderColor: category.color || '#BFA14A' }}
                >
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <ChevronDownIcon
                        className={`mt-1 w-5 h-5 text-gray-400 shrink-0 transition-transform ${
                          !collapsed ? 'rotate-180' : ''
                        }`}
                      />

                      <div className="min-w-0">
                        <h2 className="font-semibold leading-tight truncate">{category.name}</h2>
                        <p className="text-xs text-gray-500">{categoryServices.length} service(s)</p>
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setServiceModal({ isOpen: true, categoryId: category.id })
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-white hover:bg-primary/90 transition shrink-0"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Ajouter un service
                    </button>
                  </div>
                </div>

                {/* SERVICES */}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="divide-y overflow-hidden"
                    >
                      {categoryServices.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 italic">
                          Aucun service dans cette catégorie
                        </div>
                      ) : (
                        categoryServices.map(service => (
                          <div key={service.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{service.name}</span>
                                  {!service.is_visible && (
                                    <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>

                                {service.description && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {service.description}
                                  </p>
                                )}

                                <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                                  <span>{formatDuration(service.duration_minutes)}</span>
                                  <span className="font-medium text-gray-900">{formatPrice(service)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Mettre en avant uniquement si encore de la place */}
                                {featuredCount < 3 && (
                                  <button
                                    onClick={() => toggleFeatured(service, true)}
                                    title="Mettre en avant"
                                    className="
                                      flex items-center justify-center
                                      px-2 py-1.5
                                      rounded-md
                                      bg-amber-100 text-amber-700
                                      hover:bg-amber-200 transition
                                    "
                                  >
                                    {/* Mobile : étoile */}
                                    <StarIcon className="w-4 h-4 sm:hidden" />

                                    {/* Desktop : texte */}
                                    <span className="hidden sm:inline text-xs font-medium">
                                      Mettre en avant
                                    </span>
                                  </button>
                                )}


                                <button
                                  onClick={() => setServiceModal({ isOpen: true, data: service })}
                                  className="p-1.5 hover:bg-gray-100 rounded"
                                  aria-label="Modifier"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDuplicateService(service)}
                                  className="p-1.5 hover:bg-gray-100 rounded"
                                  aria-label="Dupliquer"
                                >
                                  <DocumentDuplicateIcon className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() =>
                                    setDeleteModal({
                                      isOpen: true,
                                      type: 'service',
                                      id: service.id,
                                      title: 'Supprimer le service',
                                      message: 'Cette action est irréversible.',
                                    })
                                  }
                                  className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded"
                                  aria-label="Supprimer"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
      </div>

      {/* MODALES */}
      <CategoryModal
        isOpen={categoryModal.isOpen}
        onClose={() => setCategoryModal({ isOpen: false })}
        onSubmit={data =>
          categoryModal.data
            ? handleUpdateCategory(categoryModal.data.id, data)
            : handleCreateCategory(data)
        }
        initialData={categoryModal.data}
        isLoading={isSubmitting}
      />

      <ServiceModal
        isOpen={serviceModal.isOpen}
        onClose={() => setServiceModal({ isOpen: false })}
        onSubmit={data =>
          serviceModal.data
            ? handleUpdateService(serviceModal.data.id, data)
            : handleCreateService(data)
        }
        categories={categories}
        defaultCategoryId={serviceModal.categoryId}
        initialData={
          serviceModal.data
            ? {
                id: serviceModal.data.id,
                name: serviceModal.data.name,
                description: serviceModal.data.description,
                categoryId: serviceModal.data.category_id,
                durationMinutes: serviceModal.data.duration_minutes,
                priceType: serviceModal.data.price_type,
                priceValue: serviceModal.data.price_value,
                isVisible: serviceModal.data.is_visible,
                isFeatured: serviceModal.data.is_featured,
              }
            : undefined
        }
        isLoading={isSubmitting}
        currentFeaturedCount={featuredCount}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        onConfirm={() => {
          if (deleteModal.type === 'category' && deleteModal.id) confirmDeleteCategory(deleteModal.id)
          if (deleteModal.type === 'service' && deleteModal.id) confirmDeleteService(deleteModal.id)
        }}
        title={deleteModal.title || 'Supprimer'}
        message={deleteModal.message || 'Êtes-vous sûr ?'}
        isLoading={deletingId !== null}
      />
    </div>
  )
}

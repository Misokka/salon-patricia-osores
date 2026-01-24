'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { usePublicSchedule } from '@/lib/hooks/usePublicSchedule'

import type { Service, ServiceCategoryWithServices } from '@/types/service'
import type { ServiceSelection } from '@/types/service-selection'

interface Category {
  id: string
  name: string
  services: Service[]
}

export default function ServicesPage() {
  const router = useRouter()
  const { formatted: horaires, loading: loadingHoraires } = usePublicSchedule()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Accordion: 1 seule catégorie ouverte
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get('/api/services/categories')
        if (response.data.success) {
          const cats: Category[] = response.data.data.categories || []
          setCategories(cats)

          // Ouvrir la première catégorie par défaut
          if (cats.length > 0) setOpenCategoryId(cats[0].id)
        }
      } catch (error) {
        console.error('Erreur chargement services:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  const formatPrice = (service: Service) => {
    if (service.price_type === 'quote') return 'Sur devis'
    if (service.price_type === 'from') return `À partir de ${service.price_value}€`
    return `${service.price_value}€`
  }

  const handleSelectService = (service: Service) => {
    const serviceSelection: ServiceSelection = {
      id: service.id,
      name: service.name,
      duration_label: `${service.duration_minutes} min`,
      price_label: formatPrice(service),
    }

    localStorage.setItem(
      'serviceSelectionne',
      JSON.stringify(serviceSelection)
    )

    router.push('/rendezvous/date')
  }


  return (
    <main className="bg-light min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* En-tête */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Réserver en ligne
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            24h/24 · Gratuitement · Paiement sur place
          </p>
        </div>

        {/* Layout deux colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Colonne principale - Services */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                1. Choisissez votre prestation
              </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-gray-300 border-t-primary" />
                <p className="mt-4 text-sm text-gray-600">Chargement des services...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-600">Aucun service disponible pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => {
                  const isOpen = openCategoryId === category.id

                  return (
                    <details
                      key={category.id}
                      open={isOpen}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                      onToggle={(e) => {
                        const target = e.currentTarget
                        // Si l’utilisateur ouvre celui-ci => on ferme les autres
                        if (target.open) setOpenCategoryId(category.id)
                        // Si l’utilisateur le ferme => aucun ouvert
                        else if (openCategoryId === category.id) setOpenCategoryId(null)
                      }}
                    >
                      <summary
                        className="list-none cursor-pointer select-none px-6 py-4 flex items-center justify-between"
                      >
                        <span className="text-lg sm:text-xl font-semibold text-dark">
                          {category.name}
                        </span>

                        {/* Chevron */}
                        <span
                          className={`transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        >
                          ▼
                        </span>
                      </summary>

                      {/* Contenu */}
                      <div className="px-6 pb-4 space-y-3">
                        {category.services.map((service) => {
                          const price = formatPrice(service)

                          return (
                            <div
                              key={service.id}
                              className="flex items-center justify-between py-3 px-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="flex-1">
                                <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-1">
                                  {service.name}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  {service.duration_minutes} min · {price}
                                </p>
                              </div>

                              <button
                                onClick={() => handleSelectService(service)}
                                className="bg-primary text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors text-xs sm:text-sm font-medium shadow-sm"
                              >
                                Choisir
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
            </div>
          </div>

          {/* Colonne latérale - Horaires */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 sticky top-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                Horaires d'ouverture
              </h3>

              <div className="space-y-2">
                {loadingHoraires ? (
                  <p className="text-xs sm:text-sm text-gray-400">Chargement...</p>
                ) : (
                  horaires.map((horaire) => (
                    <div
                      key={horaire.jour}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                    >
                      <span
                        className={`text-xs sm:text-sm font-medium ${
                          horaire.heures === 'Fermé'
                            ? 'text-gray-400'
                            : 'text-gray-900'
                        }`}
                      >
                        {horaire.jour}
                      </span>
                      <span
                        className={`text-xs sm:text-sm ${
                          horaire.heures === 'Fermé'
                            ? 'text-gray-400'
                            : 'text-gray-600'
                        }`}
                      >
                        {horaire.heures}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Petit fix UX: retirer le triangle natif de summary */}
      <style jsx global>{`
        summary::-webkit-details-marker {
          display: none;
        }
      `}</style>
    </main>
  )
}

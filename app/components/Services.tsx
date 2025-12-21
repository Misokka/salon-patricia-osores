'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import axios from 'axios'
import ServiceCarousel from './ServiceCarousel'
import {
  fadeUp,
  createDelayedFadeUp,
  staggerContainer,
  staggerItem,
  scrollRevealProps,
  hoverLift,
} from '@/lib/animations'

/* ----------------------------------------
   Types alignés BDD
---------------------------------------- */

type ServiceImage = {
  id: string
  image_url: string
  alt_text?: string | null
}

type Service = {
  id: string
  name: string
  description: string
  duration_minutes: number
  price_type: 'fixed' | 'from' | 'quote'
  price_value: number | null
  is_featured: boolean
  category_name?: string
  image?: ServiceImage | null
}

type ApiResponse = {
  featured: Service[]
  all: Service[]
}

/* ----------------------------------------
   Component
---------------------------------------- */

export default function Services() {
  const [featuredServices, setFeaturedServices] = useState<Service[]>([])
  const [carouselServices, setCarouselServices] = useState<Service[]>([])
  const [totalServices, setTotalServices] = useState(0)
  const [loading, setLoading] = useState(true)

  /* ----------------------------------------
     Fetch services
  ---------------------------------------- */

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get<{ success: boolean; data: ApiResponse }>(
          `/services`
        )

        if (!res.data.success) return

        const { featured, all } = res.data.data

        setFeaturedServices(featured ?? [])
        setCarouselServices((all ?? []).filter(service => !service.is_featured))
        setTotalServices(all?.length ?? 0)
      } catch (error) {
        console.error('Erreur chargement services:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  /* ----------------------------------------
     Helpers
  ---------------------------------------- */

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`
  }

  const formatPrice = (service: Service) => {
    if (service.price_type === 'quote') return 'Sur devis'
    if (service.price_type === 'from') return `À partir de ${service.price_value}€`
    return `${service.price_value}€`
  }

  /* ----------------------------------------
     Loading
  ---------------------------------------- */

  if (loading) {
    return (
      <section id="services" className="py-20 bg-light text-dark">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="mt-4 text-gray-600">Chargement des services…</p>
        </div>
      </section>
    )
  }

  /* ----------------------------------------
     Render
  ---------------------------------------- */

  return (
    <section id="services" className="py-20 bg-light text-dark">
      <div className="max-w-6xl mx-auto px-6">
        {/* Title */}
        <motion.h2
          {...scrollRevealProps}
          variants={fadeUp}
          className="text-4xl font-brand font-bold text-center mb-3"
        >
          Mes services
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          {...scrollRevealProps}
          variants={createDelayedFadeUp(0.1)}
          className="text-center text-accent text-lg mb-12"
        >
          {totalServices} service{totalServices !== 1 && 's'} disponible
          {totalServices !== 1 && 's'} au salon
        </motion.p>

        {/* Featured services */}
        {featuredServices.length > 0 && (
          <motion.div
            {...scrollRevealProps}
            variants={staggerContainer}
            className={`grid grid-cols-1 gap-10 mb-12 ${
              featuredServices.length === 3
                ? 'md:grid-cols-3'
                : featuredServices.length === 2
                ? 'md:grid-cols-2 max-w-4xl mx-auto'
                : 'max-w-md mx-auto'
            }`}
          >
            {featuredServices.map(service => (
              <motion.a
                key={service.id}
                href="#rendezvous"
                variants={staggerItem}
                whileHover={hoverLift}
                className="group rounded-2xl overflow-hidden shadow-md hover:shadow-xl bg-white transition-all duration-300 flex flex-col h-full"
              >
                {/* Image / Lettre */}
                <div className="relative h-60 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {service.image ? (
                    <Image
                      src={service.image.image_url}
                      alt={service.image.alt_text || service.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-6xl text-primary/40 font-brand">
                      {service.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-semibold text-dark mb-3 group-hover:text-primary transition">
                    {service.name}
                  </h3>

                  <p className="text-accent text-base leading-relaxed mb-4">
                    {service.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-light mt-auto">
                    <span className="text-sm text-accent flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 0 0118 0z"
                        />
                      </svg>
                      {formatDuration(service.duration_minutes)}
                    </span>

                    <span className="text-primary font-semibold text-lg">
                      {formatPrice(service)}
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}

        {/* Carousel services (SANS image par défaut) */}
        {carouselServices.length > 0 && (
          <ServiceCarousel
            services={carouselServices.map(service => ({
              id: service.id,
              name: service.name,
              duration_label: formatDuration(service.duration_minutes),
              price_label: formatPrice(service),
              category_name: service.category_name || 'Services',
              image_url: service.image?.image_url ?? null,
            }))}
          />
        )}
      </div>
    </section>
  )
}

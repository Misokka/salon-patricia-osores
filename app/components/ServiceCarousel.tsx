'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import Image from 'next/image'
import { fadeUp, scrollRevealProps } from '@/lib/animations'

import type { CarouselService } from '@/types/carousel-service'

interface ServiceCarouselProps {
  services: CarouselService[]
}

export default function ServiceCarousel({ services }: ServiceCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardsPerView, setCardsPerView] = useState(3)
  const [isHovered, setIsHovered] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  /* ----------------------------------------
     Responsive
  ---------------------------------------- */
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setCardsPerView(1)
      else if (window.innerWidth < 1024) setCardsPerView(2)
      else setCardsPerView(3)
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  /* ----------------------------------------
     Auto slide (pause on hover)
  ---------------------------------------- */
  useEffect(() => {
    if (isHovered || services.length <= cardsPerView) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const max = services.length - cardsPerView
        return prev >= max ? 0 : prev + 1
      })
    }, 4500)

    return () => clearInterval(interval)
  }, [isHovered, services.length, cardsPerView])

  /* ----------------------------------------
     Navigation
  ---------------------------------------- */
  const maxIndex = Math.max(0, services.length - cardsPerView)
  const canNavigate = services.length > cardsPerView

  const prev = () =>
    setCurrentIndex(i => (i > 0 ? i - 1 : maxIndex))

  const next = () =>
    setCurrentIndex(i => (i < maxIndex ? i + 1 : 0))

  /* ----------------------------------------
     Touch (mobile)
  ---------------------------------------- */
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current = null
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const delta = touchStartX.current - touchEndX.current
    if (delta > 50) next()
    if (delta < -50) prev()
  }

  if (services.length === 0) return null

  /* ----------------------------------------
     Render
  ---------------------------------------- */
  return (
    <motion.section
      {...scrollRevealProps}
      variants={fadeUp}
      className="mt-20 relative"
    >
      <h3 className="text-2xl font-semibold text-center mb-8">
        Autres prestations
      </h3>

      <div className="relative px-4 md:px-16">
        {/* LEFT */}
        {canNavigate && (
          <button
            onClick={prev}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow hover:bg-primary hover:text-white transition"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* CAROUSEL */}
        <div
          className="overflow-x-hidden py-4"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
            }}
          >
            {services.map(service => (
              <div
                key={service.id}
                className="px-7 flex-shrink-0"
                style={{ width: `${100 / cardsPerView}%` }}
              >
                <motion.div
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition h-full flex flex-col"
                >


                  {/* CONTENT */}
                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-xs text-accent mb-2">
                      {service.category_name}
                    </span>

                    <h4 className="text-lg font-semibold mb-2">
                      {service.name}
                    </h4>

                    <p className="text-sm text-gray-600 mb-4">
                      {service.duration_label}
                    </p>

                    <div className="mt-auto pt-3 border-t">
                      <span className="text-primary font-semibold">
                        {service.price_label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        {canNavigate && (
          <button
            onClick={next}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow hover:bg-primary hover:text-white transition"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.section>
  )
}

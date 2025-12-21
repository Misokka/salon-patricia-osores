"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaStar } from "react-icons/fa";

const testimonials = [
  {
    name: "Jingwen",
    text: "Très gentil, eficaz, prix correct. J'ai bien aimer le résultat. La coiffeuse Patricia elle sais parler espagnol , français et anglais.",
    rating: 5,
  },
  {
    name: "Dannia",
    text: "Une très bonne expérience ! J'ai adoré la coupe. Patricia est très sympathique.",
    rating: 5,
  },
  {
    name: "Ambre",
    text: "J'adore le rendu ! Coiffeuse super agréable et professionnelle je recommande à 100% de bon produits utilisés en plus.",
    rating: 5,
  },
  {
    name: "Ambre",
    text: "J'adore le rendu ! Coiffeuse super agréable et professionnelle je recommande à 100% de bon produits utilisés en plus.",
    rating: 5,
  },
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const [cardsPerView, setCardsPerView] = useState(3);

  useEffect(() => {
    const updateCardsPerView = () => {
      if (window.innerWidth < 640) {
        setCardsPerView(1);
      } else if (window.innerWidth < 1024) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3);
      }
    };

    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  // Auto-scroll si plus de 3 avis
  useEffect(() => {
    if (isHovered || testimonials.length <= 3) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = testimonials.length - cardsPerView;
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isHovered, cardsPerView]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : testimonials.length - cardsPerView));
  };

  const goToNext = () => {
    const maxIndex = testimonials.length - cardsPerView;
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const maxIndex = Math.max(0, testimonials.length - cardsPerView);
  const canNavigate = testimonials.length > 3;

  return (
    <section id="avis" className="py-20 bg-light text-dark">
      <div className="max-w-6xl mx-auto px-6">
        <h3 className="text-4xl font-brand font-bold mb-12 text-center">
          Ce que disent mes clientes
        </h3>

        <div className="relative px-4 md:px-16">
          {/* Flèche gauche - cachée mobile, visible seulement si > 3 avis */}
          {canNavigate && (
            <motion.button
              onClick={goToPrevious}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-primary hover:text-white text-dark p-3 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary items-center justify-center"
              aria-label="Avis précédent"
            >
              <FiChevronLeft className="w-6 h-6" />
            </motion.button>
          )}

          {/* Zone du carrousel */}
          <div
            ref={carouselRef}
            className="overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: canNavigate
                  ? `translateX(-${currentIndex * (100 / cardsPerView)}%)`
                  : "translateX(0)",
              }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 px-4"
                  style={{ width: `${100 / cardsPerView}%` }}
                >
                  <motion.blockquote
                    whileHover={{ y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white border border-accent/10 shadow-md rounded-2xl p-6 relative hover:shadow-xl transition-shadow duration-300 h-full flex flex-col"
                  >
                    {/* Guillemet décoratif */}
                    <span className="absolute top-4 left-6 text-primary text-5xl font-serif opacity-20 select-none">
                      "
                    </span>

                    {/* Étoiles */}
                    <div className="flex gap-1 mb-4 relative z-10">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <FaStar key={i} className="w-5 h-5 text-yellow-400" />
                      ))}
                    </div>

                    {/* Texte de l'avis */}
                    <p className="text-accent text-base leading-relaxed mb-4 relative z-10 flex-1">
                      {testimonial.text}
                    </p>

                    {/* Nom - toujours en bas */}
                    <footer className="text-right font-semibold text-primary mt-auto pt-4 border-t border-accent/10">
                      {testimonial.name}
                    </footer>
                  </motion.blockquote>
                </div>
              ))}
            </div>
          </div>

          {/* Flèche droite - cachée mobile, visible seulement si > 3 avis */}
          {canNavigate && (
            <motion.button
              onClick={goToNext}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-primary hover:text-white text-dark p-3 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary items-center justify-center"
              aria-label="Avis suivant"
            >
              <FiChevronRight className="w-6 h-6" />
            </motion.button>
          )}
        </div>

        {/* Indicateurs de position - visible seulement si > 3 avis */}
        {canNavigate && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <motion.button
                key={index}
                onClick={() => setCurrentIndex(index)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-primary w-8"
                    : "bg-accent/30 hover:bg-accent/50"
                }`}
                aria-label={`Aller au groupe d'avis ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import axios from "axios";
import salonConfig from "@/config/salon.config";
import {
  fadeUp,
  staggerContainer,
  staggerItemScale,
  scrollRevealProps,
} from "@/lib/animations";

interface GalleryImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  services?: {
    id: string;
    name: string;
  } | null;
}

export default function Gallery() {
  const [photos, setPhotos] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await axios.get(`/api/gallery/images`);
        if (res.data.success) {
          setPhotos(res.data.data || []);
        }
      } catch (err) {
        console.error('Erreur chargement galerie:', err);
        // Fallback vers images statiques
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, []);

  // Images par défaut si aucune image dans la DB
  const displayPhotos = photos;


  if (loading) {
    return (
      <section id="gallery" className="py-20 bg-white text-dark">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }

  // Ne rien afficher si aucune image
  if (displayPhotos.length === 0) {
    return null;
  }

  return (
    <section id="gallery" className="py-20 bg-white text-dark">
      <div className="max-w-6xl mx-auto px-6">
        <motion.h2
          {...scrollRevealProps}
          variants={fadeUp}
          className="text-4xl font-brand font-bold text-center mb-12"
        >
          Mes Réalisations
        </motion.h2>

        <motion.div
          {...scrollRevealProps}
          variants={staggerContainer}
          className={`grid gap-4 sm:gap-6 ${
            displayPhotos.length >= 3
              ? 'grid-cols-2 md:grid-cols-3'
              : displayPhotos.length === 2
              ? 'grid-cols-2 max-w-3xl mx-auto'
              : 'grid-cols-1 max-w-md mx-auto'
          }`}
        >
          {displayPhotos.map((photo, index) => {
            const imageUrl = photo.image_url
            const altText = photo.alt_text || `Réalisation ${index + 1}`
            const serviceName = photo.services?.name ?? null

            return (
              <motion.div
                key={photo.id}
                variants={staggerItemScale}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="relative group h-52 sm:h-64 md:h-72 overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300"
              >
                <Image
                  src={imageUrl}
                  alt={altText}
                  fill
                  className="object-cover"
                />

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  {serviceName && (
                    <span className="text-light text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {serviceName}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}

        </motion.div>
      </div>
    </section>
  );
}

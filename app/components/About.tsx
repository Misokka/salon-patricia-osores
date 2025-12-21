"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import axios from "axios";
import salonConfig from "@/config/salon.config";
import { slideInLeft, slideInRight, scrollRevealProps } from "@/lib/animations";

export default function About() {
  const [aboutImageUrl, setAboutImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAboutImage() {
      try {
        const res = await axios.get(
          `/about/image`
        );

        if (res.data.success && res.data.data?.imageUrl) {
          setAboutImageUrl(res.data.data.imageUrl);
        }
      } catch (err) {
        console.error("Erreur chargement image À propos:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAboutImage();
  }, []);

  /**
   * 🧠 LOGIQUE D’AFFICHAGE IMAGE
   * 1. Image ajoutée par l’admin
   * 2. Logo du salon (fallback propre)
   */
  const displayImage = aboutImageUrl || salonConfig.theme.images.logo;

  if (loading) {
    return (
      <section id="about" className="py-20 px-6 bg-light text-dark">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </section>
    );
  }

  return (
    <section id="about" className="py-20 px-6 bg-light text-dark">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* Image / Logo */}
        <motion.div
          {...scrollRevealProps}
          variants={slideInLeft}
          className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center"
        >
          <Image
            src={displayImage}
            alt={`À propos du salon ${salonConfig.identity.name}`}
            fill
            className={
              aboutImageUrl
                ? "object-cover"
                : "object-contain p-10"
            }
            priority
          />
        </motion.div>

        {/* Texte */}
        <motion.div
          {...scrollRevealProps}
          variants={slideInRight}
        >
          <h2 className="text-3xl md:text-4xl font-brand font-bold mb-6">
            À propos du salon
          </h2>

          <p className="text-lg leading-relaxed mb-4">
            {salonConfig.identity.longDescription}
          </p>

          <p className="text-lg leading-relaxed">
            Que vous souhaitiez une coupe, une couleur ou un relooking complet,
            vous serez accueilli(e) avec attention pour un moment de détente et
            de confiance.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

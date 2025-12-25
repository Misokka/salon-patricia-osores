"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { slideInLeft, slideInRight, scrollRevealProps } from "@/lib/animations";

export default function About() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false); // La vidéo est statique, donc pas besoin de faire un appel API
  }, []);

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
        {/* Vidéo */}
        <motion.div
          {...scrollRevealProps}
          variants={slideInLeft}
          className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center"
        >
          <video
            src="/images/video-patricia.mp4" // Remplace par le nom de ta vidéo
            className="object-cover w-full h-full"
            autoPlay
            loop
            muted
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
            Le Salon Patricia Osores à Liège vous accueille dans une atmosphère chaleureuse et authentique où chaque détail compte.
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

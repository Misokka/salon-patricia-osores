"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Button from "./Button";
import salonConfig from "@/config/salon.config";
import { fadeIn, fadeUp, createDelayedFadeUp } from "@/lib/animations";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative h-[85vh] sm:h-[90vh] w-full overflow-hidden bg-dark text-light"
    >
      {/* Image de fond */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="absolute inset-0"
      >
        <Image
          src={salonConfig.theme.images.hero}
          alt={`${salonConfig.identity.name} - Salon de coiffure professionnel à ${salonConfig.identity.city}, ${salonConfig.identity.country}`}
          fill
          priority
          className="object-cover opacity-80"
        />
      </motion.div>

      {/* Filtre sombre léger */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>

      {/* Contenu texte */}
      <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 max-w-4xl">
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-brand font-bold leading-tight text-light mb-2"
        >
          {salonConfig.identity.shortName} 
        </motion.h1>
        <motion.h2
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-3xl sm:text-3xl lg:text-4xl font-brand font-bold leading-tight text-light mb-6"
        >
          {salonConfig.identity.tagline}
        </motion.h2>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={createDelayedFadeUp(0.2)}
          className="text-lg sm:text-xl text-light/90 mb-8 max-w-xl"
        >
          {salonConfig.identity.longDescription}
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={createDelayedFadeUp(0.4)}
          className="flex space-x-4"
        >
          <Button text="Prendre rendez-vous" href="/rendezvous" />
          <Button text="Découvrir mes services" href="#services" variant="secondary" />
        </motion.div>
      </div>
    </section>
  );
}

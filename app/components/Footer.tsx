"use client";

import { motion } from "framer-motion";
import { FaInstagram, FaFacebookF } from "react-icons/fa";
import salonConfig from "@/config/salon.config";
import { staggerContainer, staggerItem, scrollRevealProps } from "@/lib/animations";
import { usePublicSchedule } from "@/lib/hooks/usePublicSchedule";

export default function Footer() {
  const { formatted: horaires, loading } = usePublicSchedule();

  return (
    <footer className="bg-dark text-light pt-12 pb-6">
      <motion.div
        {...scrollRevealProps}
        variants={staggerContainer}
        className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left"
      >
        {/* Colonne 1 : Identité */}
        <motion.div variants={staggerItem}>
          <h4 className="text-2xl font-brand font-bold mb-3 text-primary">
            {salonConfig.identity.shortName}
          </h4>
          <p className="text-sm">
            Salon de coiffure à {salonConfig.identity.city} — élégance, bien-être et savoir-faire.
          </p>
        </motion.div>

        {/* Colonne 2 : Liens rapides */}
        <motion.div variants={staggerItem}>
          <h5 className="text-lg font-semibold mb-3 text-primary">Navigation</h5>
          <ul className="space-y-2 text-sm">
            <li><a href="#home" className="hover:text-primary transition">Accueil</a></li>
            <li><a href="#services" className="hover:text-primary transition">Nos services</a></li>
            {salonConfig.features.gallery && (
              <li><a href="#gallery" className="hover:text-primary transition">Galerie</a></li>
            )}
            {salonConfig.features.testimonials && (
              <li><a href="#avis" className="hover:text-primary transition">Avis clients</a></li>
            )}
            <li><a href="#contact" className="hover:text-primary transition">Contact</a></li>
          </ul>
        </motion.div>

        {/* Colonne 3 : Infos légales */}
        <motion.div variants={staggerItem}>
          <h5 className="text-lg font-semibold mb-3 text-primary">Informations légales</h5>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/politique" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">
                Politique de confidentialité
              </a>
            </li>
            <li>
              <a href="/cgu" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">
                Conditions Générales d’Utilisation
              </a>
            </li>
            <li>
              <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">
                Mentions légales
              </a>
            </li>
          </ul>
        </motion.div>

        {/* Colonne 4 : Réseaux & horaires */}
        <motion.div variants={staggerItem}>
          <h5 className="text-lg font-semibold mb-3 text-primary">Réseaux & Horaires</h5>

          <div className="mb-4 space-y-1">
            {loading ? (
              <p className="text-sm text-gray-400">Chargement...</p>
            ) : (
              horaires.map((h) => (
                <p key={h.jour} className="text-sm">
                  <span className="font-medium">{h.jour}</span> : {h.heures}
                </p>
              ))
            )}
          </div>

          <div className="flex justify-center md:justify-start space-x-4">
            {salonConfig.contact.social.instagram && (
              <motion.a
                href={salonConfig.contact.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-primary text-dark rounded-full hover:bg-accent transition"
                aria-label="Instagram"
              >
                <FaInstagram size={18} />
              </motion.a>
            )}
            {salonConfig.contact.social.facebook && (
              <motion.a
                href={salonConfig.contact.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-primary text-dark rounded-full hover:bg-accent transition"
                aria-label="Facebook"
              >
                <FaFacebookF size={18} />
              </motion.a>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Bas de footer */}
      <div className="border-t border-accent/20 mt-8 pt-4 text-center text-sm">
        © {new Date().getFullYear()} {salonConfig.identity.name} — Tous droits réservés.
      </div>
    </footer>
  );
}

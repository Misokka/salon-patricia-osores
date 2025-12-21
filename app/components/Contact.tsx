"use client";

import { MdLocationOn, MdAccessTime, MdPhone, MdEmail } from "react-icons/md";
import Image from "next/image";
import { motion } from "framer-motion";
import Button from "./Button";
import salonConfig from "@/config/salon.config";
import {
  fadeUp,
  slideInLeft,
  slideInRight,
  scrollRevealProps,
} from "@/lib/animations";
import { usePublicSchedule } from "@/lib/hooks/usePublicSchedule";

export default function Contact() {
  const { formatted: horaires, loading } = usePublicSchedule();
  
  return (
    <section id="contact" className="py-20 bg-light text-dark">
      <div className="max-w-6xl mx-auto px-6">
        <motion.h3
          {...scrollRevealProps}
          variants={fadeUp}
          className="text-4xl font-brand font-bold mb-12 text-center"
        >
          Nous Contacter
        </motion.h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Infos contact */}
          <motion.div
            {...scrollRevealProps}
            variants={slideInLeft}
            className="space-y-6"
          >
            <div className="flex items-start">
              <MdLocationOn className="h-6 w-6 text-primary mt-1 mr-3" />
              <p>
                <strong>Adresse :</strong>
                <br />
                {salonConfig.contact.address.full}
              </p>
            </div>

            <div className="flex items-start">
              <MdAccessTime className="h-6 w-6 text-primary mt-1 mr-3" />
              <div>
                <strong>Horaires :</strong>
                <br />
                {loading ? (
                  <p className="text-gray-400">Chargement...</p>
                ) : (
                  horaires.map((h) => (
                    <p key={h.jour}>{h.jour} : {h.heures}</p>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-start">
              <MdPhone className="h-6 w-6 text-primary mt-1 mr-3" />
              <p>
                <strong>Téléphone :</strong> <a href={`tel:${salonConfig.contact.phoneLink}`} className="hover:text-primary">{salonConfig.contact.phoneDisplay}</a>
              </p>
            </div>

            <div className="flex items-start">
              <MdEmail className="h-6 w-6 text-primary mt-1 mr-3" />
              <p>
                <strong>Email :</strong> <a href={`mailto:${salonConfig.contact.email}`} className="hover:text-primary">{salonConfig.contact.email}</a>
              </p>
            </div>

            <div className="pt-4">
              <Button text="Prendre rendez-vous" href="/rendezvous" />
            </div>
          </motion.div>

          {/* Carte de localisation */}
          <motion.div
            {...scrollRevealProps}
            variants={slideInRight}
            className="w-full h-[350px] rounded-2xl overflow-hidden shadow-lg"
          >
            <iframe
              title={salonConfig.identity.name}
              src={`https://www.google.com/maps?q=${encodeURIComponent(salonConfig.contact.address.full)}&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

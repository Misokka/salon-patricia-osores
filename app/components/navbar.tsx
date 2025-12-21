"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Button from "./Button";
import { FaInstagram, FaFacebookF, FaBars, FaTimes, FaCog } from "react-icons/fa";
import salonConfig from "@/config/salon.config";
import { createClient } from "@/lib/supabase/client";

const NAVBAR_HEIGHT = 72;

export default function Navbar() {
  const [isActive, setIsActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasGalleryImages, setHasGalleryImages] = useState(true);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  useEffect(() => setMounted(true), []);

  /* -----------------------------
     Admin check
  ----------------------------- */
  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(user?.app_metadata?.role === "admin");
    };
    checkAdmin();
  }, []);

  /* -----------------------------
     Gallery check
  ----------------------------- */
  useEffect(() => {
    const checkGallery = async () => {
      try {
        const res = await fetch(`/gallery/images`);
        const data = await res.json();
        if (data.success) setHasGalleryImages((data.data || []).length > 0);
      } catch {
        setHasGalleryImages(true);
      }
    };
    checkGallery();
  }, []);

  /* -----------------------------
     Lock scroll when menu open
  ----------------------------- */
  useEffect(() => {
    document.body.style.overflow = isActive ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive]);

  const closeMenu = () => setIsActive(false);

  const links = useMemo(() => {
    return [
      ["Accueil", "/#home"],
      ["Services", "/#services"],
      ...(hasGalleryImages ? [["Galerie", "/#gallery"]] : []),
      ["À propos", "/#about"],
      ["Contact", "/#contact"],
    ] as Array<[string, string]>;
  }, [hasGalleryImages]);

  // --- Le contenu navbar (qu’on va “portal” dans body)
  const navbarUi = (
    <>
      {/* NAVBAR FIXE */}
      <header
        className="fixed top-0 inset-x-0 z-50 bg-light text-dark shadow-md font-base"
        style={{ height: NAVBAR_HEIGHT }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={salonConfig.theme.images.logo}
              alt={`Logo ${salonConfig.identity.name}`}
              className="h-10 sm:h-12 w-auto"
            />
            <div className="flex flex-col">
              <a href="/" className="text-xl sm:text-2xl font-brand font-bold tracking-wide">
                {salonConfig.identity.shortName}
              </a>
              <span className="text-xs sm:text-sm text-accent">
                {salonConfig.identity.tagline}
              </span>
            </div>
          </div>

          {/* Burger (mobile) */}
          <button
            onClick={() => setIsActive(v => !v)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-primary/10"
            aria-label={isActive ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isActive}
          >
            {isActive ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex space-x-8 text-[15px] font-medium">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="hover:text-primary transition">
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-4">
            <Button text="Prendre rendez-vous" href="/rendezvous" />

            {salonConfig.contact.social.instagram && (
              <a
                href={salonConfig.contact.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:text-primary transition"
              >
                <FaInstagram />
              </a>
            )}

            {salonConfig.contact.social.facebook && (
              <a
                href={salonConfig.contact.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:text-primary transition"
              >
                <FaFacebookF />
              </a>
            )}

            {isAdmin && (
              <button
                onClick={() => router.push("/admin")}
                className="p-2 hover:text-primary transition"
                title="Administration"
              >
                <FaCog className="text-xl" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      <div
        className={`
          lg:hidden fixed inset-x-0 bottom-0 z-40 bg-light
          transition-transform duration-300
          ${isActive ? "translate-x-0" : "translate-x-full"}
        `}
        style={{ top: NAVBAR_HEIGHT }}
      >
        <nav className="h-full overflow-y-auto px-6 py-8 space-y-4">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={closeMenu}
              className="block py-4 text-lg font-medium border-b border-gray-200"
            >
              {label}
            </a>
          ))}

          {isAdmin && (
            <button
              onClick={() => {
                closeMenu();
                router.push("/admin");
              }}
              className="flex items-center gap-3 py-4 text-lg font-medium border-b border-gray-200 w-full text-left"
            >
              <FaCog />
              Administration
            </button>
          )}

          <a
            href="/rendezvous"
            onClick={closeMenu}
            className="block mt-6 bg-primary text-white text-center py-4 rounded-lg font-semibold"
          >
            Prendre rendez-vous
          </a>
        </nav>
      </div>

      {/* OVERLAY */}
      {isActive && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20"
          style={{ top: NAVBAR_HEIGHT }}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <>
      {/* Spacer pour compenser la navbar fixe (OBLIGATOIRE) */}
      <div style={{ height: NAVBAR_HEIGHT }} />

      {/* Portal => garantit que le fixed reste fixed même si le layout parent a un transform */}
      {mounted ? createPortal(navbarUi, document.body) : null}
    </>
  );
}

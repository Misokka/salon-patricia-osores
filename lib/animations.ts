/**
 * 🎬 ANIMATIONS CENTRALISÉES
 * 
 * Variants Framer Motion réutilisables pour des animations cohérentes et premium.
 * Inspiré de la landing SaaS - animations sobres, fluides, professionnelles.
 * 
 * Stack : framer-motion
 * Philosophie : Discret, moderne, jamais intrusif
 */

import { Variants } from "framer-motion";

/**
 * 🎯 Configuration des animations
 */
export const animationConfig = {
  // Durées standardisées
  duration: {
    fast: 0.1,
    normal: 0.2,
    slow: 0.3,
  },
  // Easing standardisés (utiliser les strings Framer Motion)
  ease: {
    smooth: "easeOut" as const,
    spring: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
  // Viewport settings pour scroll reveal
  viewport: {
    once: true,
    amount: 0.3, // 30% visible avant trigger
  },
};

/**
 * 🔹 FADE UP
 * Apparition avec légère translation verticale
 * Usage : Sections, titres, contenus
 */
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
};

/**
 * 🔹 FADE IN
 * Simple apparition en fondu
 * Usage : Images, overlays
 */
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
};

/**
 * 🔹 SLIDE IN FROM LEFT
 * Entrée depuis la gauche
 * Usage : Textes, contenus latéraux
 */
export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
};

/**
 * 🔹 SLIDE IN FROM RIGHT
 * Entrée depuis la droite
 * Usage : Images, contenus latéraux
 */
export const slideInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
    },
  },
};

/**
 * 🔹 SCALE UP
 * Apparition avec légère mise à l'échelle
 * Usage : Cartes, modales
 */
export const scaleUp: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.smooth,
    },
  },
};

/**
 * 🔹 STAGGER CONTAINER
 * Container pour animations séquencées
 * Usage : Grilles, listes de cartes
 */
export const staggerContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/**
 * 🔹 STAGGER ITEM
 * Enfant d'un stagger container
 * Usage : Cartes individuelles dans une grille
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.smooth,
    },
  },
};

/**
 * 🔹 STAGGER ITEM SCALE
 * Enfant avec effet de scale
 * Usage : Galerie d'images
 */
export const staggerItemScale: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: animationConfig.duration.fast,
      ease: animationConfig.ease.smooth,
    },
  },
};

/**
 * 🎯 HELPERS
 */

/**
 * Crée un variant avec délai personnalisé
 */
export const createDelayedFadeUp = (delay: number): Variants => ({
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.smooth,
      delay,
    },
  },
});

/**
 * Props standardisées pour scroll reveal
 */
export const scrollRevealProps = {
  initial: "hidden",
  whileInView: "visible",
  viewport: animationConfig.viewport,
};

/**
 * 🎨 ANIMATIONS HOVER (pour les cartes)
 * Usage : whileHover sur motion.div
 */
export const hoverLift = {
  y: -8,
  transition: {
    duration: animationConfig.duration.fast,
    ease: "easeOut" as const,
  },
};

export const hoverScale = {
  scale: 1.02,
  transition: {
    duration: animationConfig.duration.fast,
    ease: "easeOut" as const,
  },
};

/**
 * 🎨 ANIMATIONS FOCUS (accessibilité)
 */
export const focusRing = {
  outline: "2px solid currentColor",
  outlineOffset: "2px",
};

/**
 * 📱 MEDIA QUERIES HELPERS
 * Pour désactiver animations complexes sur mobile si nécessaire
 */
export const isMobile = () =>
  typeof window !== "undefined" && window.innerWidth < 768;

/**
 * ♿ ACCESSIBILITÉ
 * Respecter prefers-reduced-motion
 */
export const shouldReduceMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Variant conditionnel selon prefers-reduced-motion
 */
export const createAccessibleVariant = (variant: Variants): Variants => {
  if (shouldReduceMotion()) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.1 } },
    };
  }
  return variant;
};

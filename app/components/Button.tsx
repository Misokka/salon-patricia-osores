"use client";

import React from "react";
import { motion, easeOut } from "framer-motion";

interface ButtonProps {
  text: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
}

export default function Button({
  text,
  href,
  onClick,
  variant = "primary",
  className = "",
}: ButtonProps) {
  const baseStyle =
    "inline-block px-6 py-2 rounded-full font-base font-medium text-sm transition-all duration-300";

  const variants = {
    primary:
      "bg-primary text-light hover:bg-opacity-90 shadow-md hover:shadow-lg",
    secondary:
      "bg-light text-dark border border-primary hover:bg-primary hover:text-light",
  };

  const combined = `${baseStyle} ${variants[variant]} ${className}`;

  const hoverAnimation = {
    y: -2,
    transition: { duration: 0.2, ease: easeOut },
  };

  const tapAnimation = {
    scale: 0.98,
  };

  if (href) {
    return (
      <motion.a
        href={href}
        className={combined}
        whileHover={hoverAnimation}
        whileTap={tapAnimation}
      >
        {text}
      </motion.a>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      className={combined}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
    >
      {text}
    </motion.button>
  );
}

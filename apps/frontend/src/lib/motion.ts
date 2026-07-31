import type { Transition, Variants } from "framer-motion";

/**
 * Vocabulaire d'animation commun.
 *
 * Un CRM se consulte toute la journée : le mouvement sert à situer
 * l'utilisateur (d'où vient ce panneau, quelle ligne vient d'apparaître),
 * jamais à faire le spectacle. D'où des durées courtes et une seule
 * courbe d'accélération pour toute l'application.
 */

export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];

export const spring: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 };

/** Transition entre deux pages : glissement vertical très court. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: "easeIn" } },
};

/** Conteneur de liste : les enfants arrivent en cascade. */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
};

/** Panneaux et modales. */
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
};

export const panelVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, y: 8, scale: 0.99, transition: { duration: 0.14 } },
};

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { pageVariants } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Enveloppe d'écran. Chaque page en hérite via le layout, ce qui garantit
 * une transition identique partout — et un seul endroit à modifier.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

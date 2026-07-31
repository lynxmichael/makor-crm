import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import makorIcon from "@/assets/makor-icon.png";
import makorWordmark from "@/assets/makor-wordmark.png";

interface SplashScreenProps {
  /** Appelé une fois l'écran de chargement entièrement disparu (fin de transition de sortie). */
  onFinished?: () => void;
}

/**
 * Écran de chargement affiché une fois au démarrage de l'application :
 * le mark Makor Telecoms tombe et rebondit avant de se stabiliser, puis le
 * nom de la marque se révèle. L'ensemble s'efface ensuite pour laisser place
 * à l'application. Respecte prefers-reduced-motion (simple fondu, sans rebond).
 */
export function SplashScreen({ onFinished }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const totalDelay = reduceMotion ? 750 : 2000;
    const timer = setTimeout(() => setVisible(false), totalDelay);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <AnimatePresence onExitComplete={onFinished}>
      {visible && (
        <motion.div
          key="splash"
          className="nav-shell fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
        >
          <div className="flex flex-col items-center gap-5">
            <motion.img
              src={makorIcon}
              alt=""
              className="h-20 w-20 drop-shadow-[0_8px_24px_rgba(14,124,134,0.35)]"
              initial={reduceMotion ? { opacity: 0 } : { y: -180, opacity: 0, scale: 0.8 }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0.4 }
                  : { type: "spring", stiffness: 300, damping: 11, mass: 1, delay: 0.15 }
              }
            />

            <motion.img
              src={makorWordmark}
              alt="Makor Telecoms"
              className="h-6 w-auto"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: reduceMotion ? 0.25 : 1.05 }}
            />
          </div>

          <motion.div
            className="h-[3px] w-36 overflow-hidden rounded-full bg-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: reduceMotion ? 0.35 : 1.25 }}
          >
            <motion.div
              className="h-full w-1/3 rounded-full bg-wire"
              animate={{ x: ["-120%", "220%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

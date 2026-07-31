import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";

import makorLogo from "@/assets/makor-logo.png";
import { EASE_OUT } from "@/lib/motion";

/**
 * Écrans de connexion.
 *
 * Le panneau de gauche affiche un « champ de signal » : des barres dont
 * l'amplitude évoque un flux de messages en transit. C'est la métaphore du
 * métier de MAKOR — router du trafic — plutôt qu'une illustration décorative.
 */
const BARS = Array.from({ length: 28 });

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-paper">
      {/* Volet de marque — masqué sous lg, l'écran de saisie prend toute la place */}
      <aside className="nav-shell relative hidden w-[46%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 p-10">
          <img src={makorLogo} alt="MAKOR" className="h-8 w-auto" draggable={false} />
        </div>

        <div className="relative z-10 px-10 pb-6">
          <h1 className="max-w-md font-display text-4xl leading-[1.1] font-semibold text-white">
            Le trafic passe.
            <br />
            <span className="text-wire">Vous voyez tout.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
            Prospection, campagnes, facturation — un seul poste de pilotage pour
            l'ensemble du catalogue MAKOR Group Telecom.
          </p>
        </div>

        {/* Champ de signal : barres animées en boucle, décalées les unes des autres */}
        <div
          className="relative z-10 flex h-40 items-end gap-[3px] px-10 pb-10"
          aria-hidden="true"
        >
          {BARS.map((_, i) => (
            <motion.span
              key={i}
              className="flex-1 rounded-full bg-wire/40"
              initial={{ height: 6 }}
              animate={{ height: [6, 10 + ((i * 37) % 62), 6] }}
              transition={{
                duration: 2.6 + (i % 5) * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.07,
              }}
            />
          ))}
        </div>

        {/* Halo derrière les barres, pour ancrer le bloc sans surcharger */}
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[130%] -translate-x-1/2 rounded-full bg-wire/15 blur-3xl" />
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="w-full max-w-sm"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

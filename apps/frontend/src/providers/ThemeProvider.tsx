import { useEffect, type ReactNode } from "react";

import { STORAGE_KEYS } from "@/config/constants";

export type Theme = "light" | "dark";

/**
 * L'identité visuelle MAKOR est conçue en clair (papier froid, encre
 * profonde). Le mode sombre n'est pas encore décliné : ce provider pose la
 * mécanique et verrouille le thème clair, plutôt que d'exposer un bouton qui
 * donnerait un résultat à moitié fini.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.theme) as Theme | null;
    const theme: Theme = stored ?? "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, []);

  return <>{children}</>;
}

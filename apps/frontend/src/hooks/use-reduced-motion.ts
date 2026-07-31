import { useEffect, useState } from "react";

/**
 * Respecte le réglage système « réduire les animations ». Utilisé pour
 * couper les transitions plutôt que les atténuer : à moitié animé est pire
 * que pas animé du tout pour les personnes concernées.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setPrefers(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return prefers;
}

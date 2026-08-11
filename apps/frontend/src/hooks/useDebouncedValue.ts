import { useEffect, useState } from "react";

/**
 * Valeur retardée, pour ne pas interroger le serveur à chaque frappe.
 *
 * La recherche des listes passe par l'API (`?search=`) et non par un filtrage
 * de la page déjà chargée : sans ce délai, saisir « Ecobank » déclencherait
 * sept requêtes dont six seraient jetées.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

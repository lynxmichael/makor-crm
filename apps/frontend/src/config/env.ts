/**
 * Variables d'environnement, lues et validées en un seul endroit.
 *
 * Un `import.meta.env.VITE_*` dispersé dans les composants est une valeur
 * qu'on découvre absente en production. Ici, l'absence se voit au démarrage.
 */

function required(name: string, value: string | undefined, fallback: string): string {
  if (!value) {
    if (import.meta.env.PROD) {
      throw new Error(
        `Variable d'environnement manquante : ${name}. ` +
          `Renseignez-la dans le fichier .env avant de construire l'application.`,
      );
    }
    return fallback;
  }
  return value;
}

export const env = {
  /** Racine de l'API, préfixe `api/v1` compris (voir `main.ts` du backend). */
  apiBaseUrl: required(
    "VITE_API_BASE",
    import.meta.env.VITE_API_BASE,
    "http://localhost:3000/api/v1",
  ),
} as const;

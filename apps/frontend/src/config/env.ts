/**
 * Point d'entrée unique pour la configuration d'environnement.
 * Aucun `import.meta.env` ailleurs dans le code : tout passe par ici,
 * ce qui rend les variables typées et remplaçables en test.
 */

function required(value: string | undefined, key: string, fallback: string): string {
  if (!value) {
    if (import.meta.env.PROD) {
      // En production, une URL d'API absente est une erreur de déploiement,
      // pas quelque chose qu'on masque derrière une valeur par défaut.
      console.error(`[config] ${key} manquant — repli sur ${fallback}`);
    }
    return fallback;
  }
  return value;
}

export const env = {
  /** Base de l'API REST — le backend expose tout sous /api/v1 (main.ts). */
  apiUrl: required(import.meta.env.VITE_API_URL, "VITE_API_URL", "http://localhost:3000/api/v1"),
  /** Racine du serveur, pour Socket.IO et les fichiers servis sous /uploads. */
  serverUrl: required(import.meta.env.VITE_SERVER_URL, "VITE_SERVER_URL", "http://localhost:3000"),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

/** Construit l'URL publique d'un document déposé via la GED. */
/**
 * URL d'un fichier déposé.
 *
 * `/uploads` n'est plus servi en statique : les fichiers passent par
 * `/files/:name`, derrière authentification. Comme le jeton voyage dans un
 * en-tête et non dans l'URL, un `window.open` direct ne l'emporte pas —
 * utilisez `downloadFile()` pour ouvrir un fichier depuis l'interface.
 */
export function uploadUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${env.apiUrl}/files/${path.replace(/^\/?uploads\/?/, "")}`;
}

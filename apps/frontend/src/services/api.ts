import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "@/config/env";
import type { ApiError } from "@/types/api";

/**
 * Client HTTP unique de l'application.
 *
 * Deux responsabilités qui ne devraient jamais remonter dans les composants :
 *  1. porter le jeton d'accès sur chaque requête ;
 *  2. renouveler la session sur 401 sans que l'utilisateur s'en aperçoive,
 *     en ne déclenchant qu'un seul appel /auth/refresh même si dix requêtes
 *     échouent en même temps (le « single-flight » ci-dessous).
 */

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// --------------------------------------------------------------------------
// Accès aux jetons
//
// Le store Zustand importe ce module ; l'inverse créerait un cycle. On passe
// donc par un registre injecté au démarrage (voir store/auth.store.ts).
// --------------------------------------------------------------------------

interface TokenBridge {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onRefreshed: (accessToken: string, refreshToken: string) => void;
  onSessionExpired: () => void;
}

let bridge: TokenBridge = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  onRefreshed: () => {},
  onSessionExpired: () => {},
};

export function connectAuthBridge(next: TokenBridge) {
  bridge = next;
}

// --------------------------------------------------------------------------
// Requête : on attache le jeton
// --------------------------------------------------------------------------

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = bridge.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --------------------------------------------------------------------------
// Réponse : renouvellement transparent de la session
// --------------------------------------------------------------------------

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

let refreshing: Promise<string | null> | null = null;

/** Endpoints où un 401 est une réponse métier, pas une session expirée. */
const NO_REFRESH_PATHS = ["/auth/login", "/auth/login/2fa", "/auth/refresh"];

async function refreshSession(): Promise<string | null> {
  const refreshToken = bridge.getRefreshToken();
  if (!refreshToken) return null;

  try {
    // Instance nue : surtout pas `api`, sinon l'intercepteur se rappellerait
    // lui-même en boucle si le refresh échoue à son tour.
    const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
      `${env.apiUrl}/auth/refresh`,
      { refreshToken },
      { withCredentials: true, timeout: 15_000 },
    );

    bridge.onRefreshed(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? "";

    const isRefreshable =
      status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH_PATHS.some((path) => url.includes(path));

    if (isRefreshable) {
      original._retried = true;

      // Single-flight : la première requête en échec lance le renouvellement,
      // les suivantes attendent le même résultat.
      refreshing ??= refreshSession().finally(() => {
        refreshing = null;
      });

      const token = await refreshing;

      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api.request(original);
      }

      bridge.onSessionExpired();
    }

    return Promise.reject(normalizeError(error));
  },
);

// --------------------------------------------------------------------------
// Normalisation des erreurs
// --------------------------------------------------------------------------

/**
 * Nest renvoie `message` tantôt en chaîne, tantôt en tableau (ValidationPipe).
 * On produit une forme unique, plus un détail par champ quand c'est possible,
 * pour que les formulaires puissent l'afficher au bon endroit.
 */
export function normalizeError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      status: 0,
      message: error instanceof Error ? error.message : "Une erreur inattendue est survenue.",
      isNetworkError: false,
    };
  }

  if (!error.response) {
    return {
      status: 0,
      message:
        error.code === "ECONNABORTED"
          ? "Le serveur met trop de temps à répondre. Réessayez dans un instant."
          : "Serveur injoignable. Vérifiez votre connexion.",
      isNetworkError: true,
    };
  }

  const { status, data } = error.response;
  const raw = (data as { message?: string | string[]; error?: string })?.message;

  let message: string;
  let fieldErrors: Record<string, string> | undefined;

  if (Array.isArray(raw)) {
    message = raw[0] ?? "Requête invalide.";
    fieldErrors = {};
    for (const line of raw) {
      // class-validator produit « email must be an email » : le premier mot
      // est le nom du champ.
      const field = line.split(" ")[0];
      if (field && !fieldErrors[field]) fieldErrors[field] = line;
    }
  } else {
    message = raw ?? (data as { error?: string })?.error ?? defaultMessage(status);
  }

  return { status, message, fieldErrors, isNetworkError: false };
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return "Requête invalide.";
    case 401:
      return "Session expirée. Reconnectez-vous.";
    case 403:
      return "Votre rôle ne donne pas accès à cette action.";
    case 404:
      return "Élément introuvable.";
    case 409:
      return "Cet élément existe déjà.";
    case 429:
      return "Trop de tentatives. Patientez une minute.";
    default:
      return status >= 500 ? "Le serveur a rencontré une erreur." : "La requête a échoué.";
  }
}

// --------------------------------------------------------------------------
// Raccourcis typés
// --------------------------------------------------------------------------

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => api.get<T>(url, config).then((r) => r.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.post<T>(url, body, config).then((r) => r.data),
  patch: <T>(url: string, body?: unknown) => api.patch<T>(url, body).then((r) => r.data),
  put: <T>(url: string, body?: unknown) => api.put<T>(url, body).then((r) => r.data),
  delete: <T>(url: string) => api.delete<T>(url).then((r) => r.data),
};

/**
 * Ouvre un fichier déposé dans un nouvel onglet.
 *
 * `/files/:name` exige un jeton, porté par un en-tête. Un `window.open` sur
 * l'URL n'emporterait pas cet en-tête et se solderait par un 401 : on récupère
 * donc le fichier par l'instance axios — qui gère aussi le renouvellement de
 * session — puis on l'ouvre depuis une URL d'objet locale.
 */
export async function openFile(path: string, filename?: string): Promise<void> {
  if (!path) return;
  if (path.startsWith("http")) {
    window.open(path, "_blank", "noopener");
    return;
  }

  const name = path.replace(/^\/?uploads\/?/, "");
  const response = await api.get(`/files/${name}`, { responseType: "blob" });

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  if (filename) link.download = filename;
  link.click();

  // Laisser au navigateur le temps d'ouvrir avant de libérer l'URL.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

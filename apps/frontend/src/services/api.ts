import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "@/config/env";
import { useAuthStore } from "@/store/auth.store";

/** Requête déjà rejouée après renouvellement : on ne recommence pas. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const api: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Renouvellement partagé.
 *
 * Quand plusieurs requêtes se heurtent au même 401 — c'est le cas d'un
 * tableau de bord qui appelle trois endpoints de front —, une seule doit
 * demander de nouveaux jetons ; les autres attendent son résultat. Sans cela
 * chaque appel consommerait un refresh token à usage unique et invaliderait
 * la session des autres.
 */
let refreshing: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }

  try {
    // Instance nue : passer par `api` rejouerait l'intercepteur et
    // boucherait sur son propre 401.
    const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
      `${env.apiBaseUrl}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );

    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    if (error.response?.status !== 401 || !config || config._retried) {
      return Promise.reject(error);
    }

    config._retried = true;

    refreshing ??= refreshSession().finally(() => {
      refreshing = null;
    });

    const token = await refreshing;

    if (!token) {
      useAuthStore.getState().clear();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
      return Promise.reject(error);
    }

    config.headers.Authorization = `Bearer ${token}`;
    return api.request(config);
  },
);

/**
 * Message d'erreur en français, prêt à afficher.
 *
 * NestJS renvoie `message` en chaîne ou en tableau selon que l'erreur vient
 * d'un `HttpException` ou du `ValidationPipe`.
 */
export function errorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] } | undefined;
    const message = payload?.message;

    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;

    if (error.code === "ERR_NETWORK") {
      return "Serveur injoignable. Vérifiez que l'API est démarrée.";
    }
  }

  return fallback;
}

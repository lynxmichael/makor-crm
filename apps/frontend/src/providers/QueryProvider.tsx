import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiError } from "@/types/api";

/**
 * Politique de cache et de reprise.
 *
 * Les erreurs remontent ici plutôt que dans chaque composant : une requête
 * qui échoue affiche un toast une fois, et les écrans n'ont à gérer que le
 * cas nominal et l'état vide.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = (error as ApiError)?.status;
          // Inutile de réessayer si le serveur nous dit non.
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },

    queryCache: new QueryCache({
      onError: (error, query) => {
        // Silence si l'écran gère lui-même l'erreur (meta.silent).
        if (query.meta?.silent) return;
        const { status, message } = error as ApiError;
        if (status === 401) return; // déjà traité par l'intercepteur
        toast.error(message);
      },
    }),

    mutationCache: new MutationCache({
      onError: (error) => {
        const { status, message } = error as ApiError;
        if (status === 401) return;
        toast.error(message);
      },
    }),
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState pour que le client survive aux re-rendus sans être recréé,
  // et qu'il reste isolé par montage (utile en test).
  const [client] = useState(createQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

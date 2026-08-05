import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Un 401 est déjà traité par l'intercepteur axios (renouvellement
            // puis rejeu) : le réessayer ici doublerait les appels sans rien
            // résoudre.
            retry: (failureCount, error) => {
              const status = (error as { response?: { status?: number } })?.response
                ?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

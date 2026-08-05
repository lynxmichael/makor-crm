import { Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/services/api";

interface AsyncBoundaryProps<T> {
  isLoading: boolean;
  error: unknown;
  data: T | undefined;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
}

/**
 * Chargement, erreur, contenu.
 *
 * Chaque vue doit traiter ces états — l'erreur en français, avec un bouton
 * « Réessayer ». Sans ce garde-fou, un backend arrêté laisse un écran blanc
 * sans explication.
 */
export function AsyncBoundary<T>({
  isLoading,
  error,
  data,
  onRetry,
  children,
}: AsyncBoundaryProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des données…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <TriangleAlert className="h-6 w-6 text-danger" />
        <p className="text-sm font-semibold text-text">
          Impossible de charger ces données.
        </p>
        <p className="max-w-md text-sm text-muted">{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  if (!data) return null;

  return <>{children(data)}</>;
}

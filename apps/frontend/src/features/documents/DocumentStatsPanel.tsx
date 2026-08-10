import { useQuery } from "@tanstack/react-query";
import { Download, Eye, MailCheck, Send } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/DataState";

import { http } from "@/services/api";
import { formatDateTime } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

interface Stats {
  document: Row;
  counts: { viewed: number; previewed: number; downloaded: number; sent: number };
  firstClientAccessAt: string | null;
  recent: Row[];
}

const EVENT_LABELS: Record<string, string> = {
  VIEWED: "Consulté",
  PREVIEWED: "Aperçu",
  DOWNLOADED: "Téléchargé",
  SENT: "Envoyé",
};

/**
 * Statistiques d'un document (demande du 31/07/2026).
 *
 * L'indicateur qui compte n'est pas le nombre de vues mais la première
 * ouverture par le client : c'est ce qui dit si la facture proforma envoyé a été lu,
 * et c'est la question qu'on se pose avant de relancer.
 */
export function DocumentStatsPanel({ documentId }: { documentId: string }) {
  const query = useQuery({
    queryKey: ["documents", "stats", documentId],
    queryFn: () => http.get<Stats>(`/documents/${documentId}/stats`),
    enabled: Boolean(documentId),
  });

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />;
  }

  const { counts, firstClientAccessAt, recent } = query.data;

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ["Envois", counts.sent, Send],
            ["Aperçus", counts.previewed, Eye],
            ["Consultations", counts.viewed, Eye],
            ["Téléchargements", counts.downloaded, Download],
          ] as const
        ).map(([label, value, Icon]) => (
          <div key={label} className="rounded-xl border border-line bg-paper p-3">
            <dt className="flex items-center gap-1.5 text-xs text-slate">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </dt>
            <dd className="mt-1 font-display text-xl font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div
        className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm leading-relaxed ${
          firstClientAccessAt ? "bg-signal/10 text-signal" : "bg-paper text-slate"
        }`}
      >
        <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
        {firstClientAccessAt ? (
          <span>
            Ouvert par le client le{" "}
            <strong>{formatDateTime(firstClientAccessAt)}</strong>.
          </span>
        ) : (
          <span>
            Aucune ouverture côté client pour l'instant — soit le document n'a pas été envoyé,
            soit il n'a pas encore été consulté.
          </span>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-display text-sm font-semibold text-ink">Derniers accès</h3>

        {recent.length === 0 ? (
          <p className="rounded-lg bg-paper px-3 py-6 text-center text-sm text-slate">
            Aucun accès enregistré.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {recent.map((event) => {
              const user = event.user as Row | undefined;

              return (
                <li
                  key={String(event.id)}
                  className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
                >
                  <span className="text-ink">
                    {EVENT_LABELS[String(event.type)] ?? String(event.type)}
                  </span>
                  <span className="text-xs text-slate">
                    {user
                      ? `${String(user.firstName ?? "")} ${String(user.lastName ?? "")}`
                      : "Client"}
                  </span>
                  <span className="ml-auto text-xs text-slate">
                    {formatDateTime(event.createdAt as string)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

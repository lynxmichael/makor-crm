import { useQuery } from "@tanstack/react-query";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { http } from "@/services/api";
import { formatDateTime } from "@/lib/format";

type Row = Record<string, unknown> & { id?: unknown };

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Réussie",
  PARTIAL: "Partielle",
  FAILED: "Échouée",
  SKIPPED: "Ignorée",
};

const STATUS_TONES: Record<string, "signal" | "amber" | "alert" | "neutral"> = {
  SUCCESS: "signal",
  PARTIAL: "amber",
  FAILED: "alert",
  SKIPPED: "neutral",
};

export function WorkflowRunsModal({
  workflow,
  onClose,
}: {
  workflow: Row | null;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["workflows", "runs", workflow?.id],
    queryFn: () => http.get<Row[]>(`/workflows/${String(workflow!.id)}/runs`),
    enabled: Boolean(workflow),
  });

  const runs = query.data ?? [];

  return (
    <Modal
      open={Boolean(workflow)}
      onClose={onClose}
      title={`Exécutions — ${String(workflow?.name ?? "")}`}
      description="Y compris les déclenchements ignorés faute de condition remplie."
      className="max-w-3xl"
    >
      {query.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <p className="rounded-lg bg-paper px-3 py-8 text-center text-sm text-slate">
          Cette règle ne s'est encore jamais déclenchée.
        </p>
      ) : (
        <ul className="scrollbar-thin max-h-[60vh] space-y-2 overflow-y-auto">
          {runs.map((run) => {
            const status = String(run.status ?? "");

            return (
              <li key={String(run.id)} className="rounded-lg border border-line px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONES[status] ?? "neutral"}>
                    {STATUS_LABELS[status] ?? status}
                  </Badge>

                  <span className="font-mono-tabular text-xs text-slate">
                    {String(run.entityType ?? "")} · {String(run.entityId ?? "").slice(0, 10)}…
                  </span>

                  <span className="ml-auto text-xs text-slate">
                    {formatDateTime(run.createdAt as string)} · {String(run.durationMs ?? 0)} ms
                  </span>
                </div>

                {run.skipReason && (
                  <p className="mt-1 text-xs text-slate">{String(run.skipReason)}</p>
                )}

                {run.result && Object.keys(run.result as Row).length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {Object.entries(run.result as Record<string, string>).map(([key, value]) => (
                      <li
                        key={key}
                        className={`text-xs ${value === "ok" ? "text-slate" : "text-alert"}`}
                      >
                        Action {key.slice(0, 6)}… : {value}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

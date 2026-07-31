import { motion } from "framer-motion";
import { Inbox, RotateCw, ServerCrash } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EASE_OUT } from "@/lib/motion";
import type { ApiError } from "@/types/api";

/** Squelette de table — mêmes gabarits de colonnes que le contenu réel. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <motion.div
          key={r}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: r * 0.04, duration: 0.25 }}
          className="flex items-center gap-4"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={c === 0 ? "h-4 flex-[2]" : "h-4 flex-1"} />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  detail: string;
  action?: ReactNode;
  icon?: typeof Inbox;
}

/** Un écran vide est une invitation à agir, pas un constat d'échec. */
export function EmptyState({ title, detail, action, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-paper text-slate">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate">{detail}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/** Erreur de chargement : dire ce qui s'est passé, proposer de réessayer. */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-alert/10 text-alert">
        <ServerCrash className="h-5 w-5" />
      </div>
      <p className="font-display text-base font-semibold text-ink">Chargement impossible</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate">{error.message}</p>
      <Button variant="secondary" className="mt-5" onClick={onRetry}>
        <RotateCw className="h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}

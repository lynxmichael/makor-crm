import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SignalMeter } from "@/components/ui/SignalMeter";
import { formatCFA, formatDate } from "@/lib/utils";
import {
  CANONICAL_STAGE_LABELS,
  dealAccountName,
  dealAmount,
  ownerName,
  type BoardDeal,
  type BoardStage,
} from "@/services/pipeline";
import { probabilityLevel, probabilityTone } from "@/features/opportunities/probability";

interface DealDetailModalProps {
  deal: BoardDeal | null;
  stage: BoardStage | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-right text-sm text-text">{value}</span>
    </div>
  );
}

/**
 * Fiche d'une opportunité, en lecture.
 *
 * Elle n'affiche que ce que l'API renvoie réellement. La grille de
 * qualification par étape, la check-list de mise en service et les règlements
 * de l'ancienne maquette n'ont **aucune contrepartie** dans le modèle `Deal` :
 * les remettre ici reviendrait à afficher des champs qui ne se sauvegardent
 * nulle part. Ils reviendront quand le modèle les portera.
 */
export function DealDetailModal({ deal, stage, onClose }: DealDetailModalProps) {
  if (!deal) return null;

  const account = dealAccountName(deal);
  const amount = dealAmount(deal);

  return (
    <Modal
      open={Boolean(deal)}
      onClose={onClose}
      title={deal.title}
      description={account ?? "Aucun client ni prospect rattaché"}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {stage && (
            <Badge tone="wire">
              {stage.name}
              {stage.name !== CANONICAL_STAGE_LABELS[stage.canonicalStage] &&
                ` · ${CANONICAL_STAGE_LABELS[stage.canonicalStage]}`}
            </Badge>
          )}
          {stage?.isClosedWon && <Badge tone="signal">Gagnée</Badge>}
          {stage?.isClosedLost && <Badge tone="alert">Perdue</Badge>}
        </div>

        <p className="font-display text-2xl font-semibold text-text">
          {formatCFA(amount)}
        </p>

        <div className="flex items-center gap-3">
          <SignalMeter
            level={probabilityLevel(deal.probability)}
            tone={probabilityTone(deal.probability)}
            label={`${deal.probability} %`}
          />
          <span className="text-xs text-muted">de probabilité</span>
        </div>

        {deal.description && (
          <p className="rounded-xl bg-bg px-3.5 py-3 text-sm text-text">
            {deal.description}
          </p>
        )}

        <div>
          <Row label="Commercial" value={ownerName(deal.assignedTo)} />
          <Row label="Client" value={deal.customer?.companyName ?? "—"} />
          <Row
            label="Prospect"
            value={
              deal.lead
                ? (deal.lead.company ??
                  `${deal.lead.firstName} ${deal.lead.lastName}`)
                : "—"
            }
          />
          <Row
            label="Clôture prévue"
            value={
              deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "—"
            }
          />
          <Row label="Créée le" value={formatDate(deal.createdAt)} />
          <Row label="Dernière modification" value={formatDate(deal.updatedAt)} />
        </div>

        {stage?.requiresSignedOrder && (
          <p className="flex items-start gap-2 rounded-xl bg-warning-bg px-3.5 py-3 text-xs text-warning">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Cette étape exige un bon de commande signé. Une opportunité ne peut
            y entrer sans lui.
          </p>
        )}
      </div>
    </Modal>
  );
}

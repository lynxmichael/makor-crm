import { useMemo, useState, type DragEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SignalMeter } from "@/components/ui/SignalMeter";
import { EntityFormModal, type FieldDef } from "@/components/shared/EntityFormModal";
import { mockOpportunities, pipelineStageLabels, sectors, countries } from "@/data/mock";
import { cn, formatCFA } from "@/lib/utils";
import type { ModuleRow, Opportunity, PipelineStage } from "@/types";

const stages = Object.keys(pipelineStageLabels) as PipelineStage[];
const products = ["SMS Marketing", "OTP", "API SMS", "WhatsApp", "Voice", "Sender ID"];
const team = ["Aïcha Koné", "Moussa Traoré", "Sarah Bamba"];

const opportunityFields: FieldDef[] = [
  { key: "clientName", label: "Client", placeholder: "Ex. Ecobank CI" },
  { key: "sector", label: "Secteur d'activité", type: "select", options: sectors },
  { key: "product", label: "Produit", type: "select", options: products },
  { key: "country", label: "Pays", type: "select", options: countries },
  { key: "value", label: "Valeur estimée (FCFA)", type: "number", placeholder: "Ex. 5000000" },
  { key: "probability", label: "Probabilité (%)", type: "number", placeholder: "Ex. 40" },
  { key: "owner", label: "Commercial", type: "select", options: team },
];

function probabilityLevel(p: number): 1 | 2 | 3 | 4 {
  if (p < 30) return 1;
  if (p < 60) return 2;
  if (p < 90) return 3;
  return 4;
}

function probabilityTone(p: number): "alert" | "amber" | "signal" {
  if (p < 30) return "alert";
  if (p < 60) return "amber";
  return "signal";
}

export function PipelinePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(mockOpportunities);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const byStage = useMemo(() => {
    const map = new Map<PipelineStage, Opportunity[]>();
    stages.forEach((s) => map.set(s, []));
    opportunities.forEach((o) => map.get(o.stage)?.push(o));
    return map;
  }, [opportunities]);

  function handleDrop(stage: PipelineStage) {
    if (draggingId) {
      setOpportunities((prev) => prev.map((o) => (o.id === draggingId ? { ...o, stage } : o)));
    }
    setDraggingId(null);
    setDragOverStage(null);
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDelete(id: string) {
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
  }

  function handleCreate(values: ModuleRow) {
    const created: Opportunity = {
      id: `o${Date.now()}`,
      clientName: String(values.clientName ?? ""),
      sector: String(values.sector ?? ""),
      product: String(values.product ?? "SMS Marketing") as Opportunity["product"],
      country: String(values.country ?? ""),
      value: Number(values.value ?? 0),
      probability: Math.min(100, Math.max(0, Number(values.probability ?? 20))),
      stage: "prospect",
      owner: String(values.owner ?? ""),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setOpportunities((prev) => [created, ...prev]);
  }

  const totalValue = opportunities.filter((o) => o.stage !== "vente").reduce((s, o) => s + o.value, 0);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Pipeline commercial</h1>
          <p className="mt-1 text-sm text-slate">
            Prospect → RDV → Proposition → Bon de commande → Contrat → Vente · {formatCFA(totalValue)} en cours
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle opportunité
        </Button>
      </div>

      <div className="scrollbar-thin flex flex-1 gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const items = byStage.get(stage) ?? [];
          const stageValue = items.reduce((s, o) => s + o.value, 0);
          const isOver = dragOverStage === stage;

          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
              onDrop={() => handleDrop(stage)}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-xl border border-line bg-paper/60 transition-colors",
                isOver && "border-wire bg-wire/5"
              )}
            >
              <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{pipelineStageLabels[stage]}</p>
                  <p className="font-mono-tabular text-[11px] text-slate">{formatCFA(stageValue)}</p>
                </div>
                <span className="rounded-full bg-line/60 px-2 py-0.5 font-mono-tabular text-xs text-slate">
                  {items.length}
                </span>
              </div>

              <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-2.5">
                {items.map((opp) => (
                  <Card
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    className={cn(
                      "group cursor-grab space-y-2 p-3 active:cursor-grabbing",
                      draggingId === opp.id && "opacity-40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug text-ink">{opp.clientName}</p>
                      <button
                        type="button"
                        onClick={() => handleDelete(opp.id)}
                        aria-label="Retirer l'opportunité"
                        className="rounded-full p-1 text-slate opacity-0 transition-opacity hover:bg-alert/10 hover:text-alert group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Badge tone="wire">{opp.product}</Badge>
                    <p className="font-mono-tabular text-sm font-semibold text-ink">{formatCFA(opp.value)}</p>
                    <div className="flex items-center justify-between">
                      <SignalMeter
                        level={probabilityLevel(opp.probability)}
                        tone={probabilityTone(opp.probability)}
                        label={`${opp.probability}%`}
                      />
                      <span className="text-[11px] text-slate">{opp.owner.split(" ")[0]}</span>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-slate/70">Aucun deal à cette étape</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EntityFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        title="Nouvelle opportunité"
        description="Elle apparaît à l'étape Prospect."
        fields={opportunityFields}
      />
    </div>
  );
}

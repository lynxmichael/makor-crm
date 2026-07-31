import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { qualificationSections, goLiveChecklistItems, pipelineStageLabels } from "@/data/mock";
import { cn, formatCFA } from "@/lib/utils";
import type { Opportunity, Payment } from "@/types";

const paymentChannels = ["Virement bancaire", "Mobile Money", "Chèque", "Espèces"];

interface OpportunityQualificationModalProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Opportunity>) => void;
}

/**
 * Fiche détaillée d'une opportunité : grille de qualification par étape
 * (Prospection, Business case, Bon de commande, Négociation, Closing),
 * check-list de mise en service (Go Live) et règlements encaissés.
 * Reprend telles quelles les grilles du classeur "Reporting Commercial 2026".
 */
export function OpportunityQualificationModal({ opportunity, onClose, onSave }: OpportunityQualificationModalProps) {
  const [lastId, setLastId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [qualification, setQualification] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState({ amount: "", date: "", channel: paymentChannels[0], comment: "" });

  // Recharge l'état local à chaque changement d'opportunité ouverte (voir EntityFormModal pour le même schéma).
  if (opportunity && opportunity.id !== lastId) {
    setLastId(opportunity.id);
    setQualification(opportunity.qualification ?? {});
    setChecklist(opportunity.goLiveChecklist ?? {});
    setPayments(opportunity.payments ?? []);
    setOpenSection(opportunity.stage);
    setAddingPayment(false);
  }

  if (!opportunity) return null;

  function updateField(sectionStage: string, key: string, value: string) {
    setQualification((prev) => ({ ...prev, [`${sectionStage}.${key}`]: value }));
  }

  function toggleChecklist(key: string) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleAddPayment() {
    if (!paymentDraft.amount || !paymentDraft.date) return;
    const payment: Payment = {
      id: `pay-${opportunity.id}-${Date.now()}`,
      amount: Number(paymentDraft.amount),
      date: paymentDraft.date,
      channel: paymentDraft.channel,
      comment: paymentDraft.comment.trim() || undefined,
    };
    setPayments((prev) => [...prev, payment]);
    setPaymentDraft({ amount: "", date: "", channel: paymentChannels[0], comment: "" });
    setAddingPayment(false);
  }

  function handleSave() {
    onSave(opportunity.id, { qualification, goLiveChecklist: checklist, payments });
    onClose();
  }

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const checklistDone = goLiveChecklistItems.filter((item) => checklist[item.key]).length;

  return (
    <Modal
      open={!!opportunity}
      onClose={onClose}
      title={opportunity.clientName}
      description={`${opportunity.product} · ${formatCFA(opportunity.value)} · Étape actuelle : ${pipelineStageLabels[opportunity.stage]}`}
      className="max-w-2xl"
    >
      <div className="space-y-3">
        {qualificationSections.map((section) => {
          const answered = section.fields.filter((f) => qualification[`${section.stage}.${f.key}`]?.trim()).length;
          const isOpen = openSection === section.stage;
          const isCurrent = section.stage === opportunity.stage;
          return (
            <div key={section.stage} className="overflow-hidden rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : section.stage)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                  isCurrent ? "bg-wire/5" : "bg-paper/40 hover:bg-paper/70"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{section.title}</span>
                  {isCurrent && <Badge tone="wire">Étape actuelle</Badge>}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono-tabular text-[11px] text-slate">
                    {answered}/{section.fields.length}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate transition-transform", isOpen && "rotate-180")} />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-line px-4 py-4">
                      {section.fields.map((field) => (
                        <div key={field.key}>
                          <Label htmlFor={`${section.stage}.${field.key}`}>{field.label}</Label>
                          <Textarea
                            id={`${section.stage}.${field.key}`}
                            rows={2}
                            value={qualification[`${section.stage}.${field.key}`] ?? ""}
                            onChange={(e) => updateField(section.stage, field.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="overflow-hidden rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === "go_live" ? null : "go_live")}
            className={cn(
              "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
              opportunity.stage === "go_live" ? "bg-wire/5" : "bg-paper/40 hover:bg-paper/70"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Go live — mise en service</span>
              {opportunity.stage === "go_live" && <Badge tone="wire">Étape actuelle</Badge>}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono-tabular text-[11px] text-slate">
                {checklistDone}/{goLiveChecklistItems.length}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate transition-transform", openSection === "go_live" && "rotate-180")} />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {openSection === "go_live" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-2 border-t border-line px-4 py-4">
                  {goLiveChecklistItems.map((item) => (
                    <label key={item.key} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-paper/60">
                      <input
                        type="checkbox"
                        checked={!!checklist[item.key]}
                        onChange={() => toggleChecklist(item.key)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-wire focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire"
                      />
                      <span className={cn("text-sm", checklist[item.key] ? "text-ink" : "text-slate")}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rounded-xl border border-line p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Règlements</h3>
            <span className="font-mono-tabular text-xs text-slate">{formatCFA(totalPaid)} encaissés</span>
          </div>
          <div className="mt-3 space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="rounded-lg bg-paper/50 px-3 py-2 text-sm">
                <p className="font-medium text-ink">{formatCFA(p.amount)}</p>
                <p className="text-xs text-slate">
                  {p.date} · {p.channel}
                  {p.comment ? ` · ${p.comment}` : ""}
                </p>
              </div>
            ))}
            {payments.length === 0 && <p className="text-xs text-slate/70">Aucun règlement enregistré.</p>}
          </div>

          <AnimatePresence initial={false} mode="wait">
            {addingPayment ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="mt-3 space-y-2 rounded-lg border border-line bg-paper/30 p-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Montant (FCFA)</Label>
                    <Input
                      type="number"
                      value={paymentDraft.amount}
                      onChange={(e) => setPaymentDraft((d) => ({ ...d, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={paymentDraft.date}
                      onChange={(e) => setPaymentDraft((d) => ({ ...d, date: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Canal de règlement</Label>
                  <Select
                    value={paymentDraft.channel}
                    onChange={(e) => setPaymentDraft((d) => ({ ...d, channel: e.target.value }))}
                  >
                    {paymentChannels.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Commentaire</Label>
                  <Input
                    value={paymentDraft.comment}
                    onChange={(e) => setPaymentDraft((d) => ({ ...d, comment: e.target.value }))}
                    placeholder="Optionnel"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setAddingPayment(false)}>
                    Annuler
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddPayment}>
                    Ajouter
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setAddingPayment(true)}>
                  <Plus className="h-4 w-4" />
                  Ajouter un règlement
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button type="button" onClick={handleSave}>
            Enregistrer la fiche
          </Button>
        </div>
      </div>
    </Modal>
  );
}

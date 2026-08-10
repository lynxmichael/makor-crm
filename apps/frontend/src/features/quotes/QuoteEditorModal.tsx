import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";
import { AiGeneratePanel } from "@/features/ai/AiGeneratePanel";

import { customersService, productsService, quotesService } from "@/services/resources";
import { settingsService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { QK } from "@/config/constants";
import { formatMoney } from "@/lib/format";
import type { ApiError } from "@/types/api";
import { SignaturePanel } from "@/features/signatures/SignaturePanel";
import { CommentThread } from "@/features/collaboration/CommentThread";

interface QuoteLine {
  /** Clé de rendu uniquement — le backend ne la reçoit pas. */
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  productId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Facture proforma existante, pour édition. */
  quote?: Record<string, unknown> | null;
}

const emptyLine = (): QuoteLine => ({
  key: Math.random().toString(36).slice(2),
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
});

export function QuoteEditorModal({ open, onClose, quote }: Props) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isEdit = Boolean(quote);

  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);

  /**
   * Taux de TVA lu dans les paramètres, uniquement pour l'aperçu.
   * Le montant qui fait foi est celui que le serveur recalcule à
   * l'enregistrement — l'écran ne fait qu'annoncer un ordre de grandeur.
   */
  const organization = useQuery({
    queryKey: [...QK.settings, "organization"],
    queryFn: () => settingsService.organization(),
    staleTime: 5 * 60 * 1000,
  });

  const vatRate = Number(organization.data?.vatRate ?? 0);

  useEffect(() => {
    if (!open) return;

    setTitle(String(quote?.title ?? ""));
    setCustomerId(String(quote?.customerId ?? ""));
    setValidUntil(
      typeof quote?.validUntil === "string" ? quote.validUntil.slice(0, 10) : "",
    );
    setNotes(String(quote?.notes ?? ""));

    const existing = (quote?.items as QuoteLine[] | undefined)?.map((item) => ({
      key: Math.random().toString(36).slice(2),
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount ?? 0),
      productId: item.productId,
    }));

    setLines(existing?.length ? existing : [emptyLine()]);
  }, [open, quote]);

  const save = useMutation({
    mutationFn: () => {
      // Les totaux ne sont jamais envoyés : le serveur les recalcule depuis
      // les lignes. Les transmettre laisserait croire que le client peut
      // décider du montant d'une facture proforma.
      const body = {
        title: title.trim(),
        customerId,
        createdById: currentUserId,
        ...(validUntil ? { validUntil: new Date(validUntil).toISOString() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: lines
          .filter((line) => line.description.trim() && line.quantity > 0)
          .map(({ description, quantity, unitPrice, discount, productId }) => ({
            description: description.trim(),
            quantity: Number(quantity),
            unitPrice: Number(unitPrice),
            ...(discount ? { discount: Number(discount) } : {}),
            ...(productId ? { productId } : {}),
          })),
      };

      return isEdit
        ? quotesService.update(String(quote!.id), body)
        : quotesService.create(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Facture proforma mise à jour" : "Facture proforma créée");
      queryClient.invalidateQueries({ queryKey: QK.quotes });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  function updateLine(key: string, patch: Partial<QuoteLine>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  /** Aperçu local, calqué sur la formule du serveur (`quotes.service.ts`). */
  const preview = useMemo(() => {
    let subtotal = 0;
    let discount = 0;

    for (const line of lines) {
      const lineDiscount = Number(line.discount) || 0;
      subtotal += Number(line.quantity) * Number(line.unitPrice) - lineDiscount;
      discount += lineDiscount;
    }

    const tax = subtotal * vatRate;
    return { subtotal, discount, tax, total: subtotal + tax };
  }, [lines, vatRate]);

  const validLines = lines.filter((line) => line.description.trim() && line.quantity > 0);
  const canSubmit = title.trim().length > 1 && customerId && validLines.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Facture proforma ${quote?.number ?? ""}` : "Nouvelle facture proforma"}
      description="Le numéro et les montants sont attribués par le serveur à l'enregistrement."
      className="max-w-4xl"
    >
      <div className="scrollbar-thin max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Objet de la facture proforma" htmlFor="quote-title" required>
            <Input
              id="quote-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Campagne SMS Marketing — trimestre 3"
              autoFocus
            />
          </Field>

          <Field label="Client" htmlFor="quote-customer" required>
            <EntitySelect
              id="quote-customer"
              service={customersService}
              queryKey={QK.customers}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              render={(row) => ({
                label: String(row.companyName ?? ""),
                detail: [row.city, row.country].filter(Boolean).join(", ") || undefined,
              })}
              placeholder="Rechercher un client"
            />
          </Field>

          <Field label="Valable jusqu'au" htmlFor="quote-valid">
            <Input
              id="quote-valid"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </Field>
        </div>

        {/* Lignes */}
        <div className="rounded-xl border border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h3 className="font-display text-sm font-semibold text-ink">Lignes de la facture proforma</h3>
            <Button size="sm" variant="secondary" onClick={() => setLines((p) => [...p, emptyLine()])}>
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>

          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                  <th className="px-3 py-2">Produit</th>
                  <th className="px-3 py-2">Désignation</th>
                  <th className="w-24 px-3 py-2 text-right">Qté</th>
                  <th className="w-36 px-3 py-2 text-right">P.U.</th>
                  <th className="w-32 px-3 py-2 text-right">Remise</th>
                  <th className="w-36 px-3 py-2 text-right">Total</th>
                  <th className="w-12 px-3 py-2" />
                </tr>
              </thead>

              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <div className="min-w-[180px]">
                        <EntitySelect
                          service={productsService}
                          queryKey={QK.products}
                          value={line.productId}
                          onChange={(id, row) =>
                            updateLine(line.key, {
                              productId: id || undefined,
                              // Reprendre le libellé et le prix catalogue, que
                              // le commercial reste libre d'ajuster ensuite.
                              ...(row
                                ? {
                                    description: String(row.name ?? line.description),
                                    unitPrice: Number(row.price ?? line.unitPrice),
                                  }
                                : {}),
                            })
                          }
                          render={(row) => ({
                            label: String(row.name ?? ""),
                            detail: `${String(row.code ?? "")} · ${formatMoney(row.price as number)}`,
                          })}
                          placeholder="Catalogue"
                        />
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                        placeholder="Désignation libre"
                        className="min-w-[180px]"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                        className="text-right"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) })}
                        className="text-right"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={line.discount}
                        onChange={(e) => updateLine(line.key, { discount: Number(e.target.value) })}
                        className="text-right"
                      />
                    </td>

                    <td className="px-3 py-2 text-right font-mono-tabular text-ink">
                      {formatMoney(line.quantity * line.unitPrice - (line.discount || 0))}
                    </td>

                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-alert hover:bg-alert/10"
                        disabled={lines.length === 1}
                        onClick={() => setLines((p) => p.filter((l) => l.key !== line.key))}
                        aria-label="Supprimer la ligne"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aperçu — indicatif, le serveur fait foi */}
          <div className="flex justify-end border-t border-line bg-paper/50 px-4 py-3">
            <dl className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate">Sous-total</dt>
                <dd className="font-mono-tabular text-ink">{formatMoney(preview.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate">Remise</dt>
                <dd className="font-mono-tabular text-ink">{formatMoney(preview.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate">
                  TVA {organization.isPending ? "" : `(${(vatRate * 100).toFixed(0)} %)`}
                </dt>
                <dd className="font-mono-tabular text-ink">{formatMoney(preview.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-semibold">
                <dt className="text-ink">Total TTC</dt>
                <dd className="font-mono-tabular text-ink">{formatMoney(preview.total)}</dd>
              </div>
              <p className="pt-1 text-[11px] leading-snug text-slate">
                Montants indicatifs — recalculés par le serveur à l'enregistrement.
              </p>
            </dl>
          </div>
        </div>

        <Field label="Notes" htmlFor="quote-notes">
          <Textarea
            id="quote-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Conditions particulières, contexte de la proposition…"
          />
        </Field>

        {/* Rédaction assistée — disponible seulement sur une facture proforma enregistré,
            puisque le contexte chiffré est reconstruit en base côté serveur. */}
        {isEdit && (
          <AiGeneratePanel
            taskType="QUOTE_INTRO"
            entityType="QUOTE"
            entityId={String(quote!.id)}
            onAccept={(text) => setNotes((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
        )}

        {/* Signature électronique — même condition : la demande porte sur un
            devis déjà enregistré, dont le PDF peut être rendu côté serveur. */}
        {isEdit && (
          <SignaturePanel
            entityType="QUOTE"
            entityId={String(quote!.id)}
            defaultSignerEmail={String((quote as Record<string, unknown>)?.customerEmail ?? "")}
          />
        )}

        {isEdit && (
          <CommentThread
            entityType="QUOTE"
            entityId={String(quote!.id)}
            emptyDetail="Notez ici le contexte de la proposition ou un point négocié."
          />
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
          Annuler
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !canSubmit}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Enregistrer" : "Créer la facture proforma"}
        </Button>
      </div>
    </Modal>
  );
}

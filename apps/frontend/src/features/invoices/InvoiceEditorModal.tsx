import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";
import { CommentThread } from "@/features/collaboration/CommentThread";
import { InvoicePaymentsPanel } from "./InvoicePaymentsPanel";

import {
  contractsService,
  customersService,
  invoicesService,
  productsService,
  settingsService,
} from "@/services/resources";
import { QK } from "@/config/constants";
import { formatMoney } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

interface Line {
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
  invoice?: Row | null;
}

const emptyLine = (): Line => ({
  key: Math.random().toString(36).slice(2),
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
});

/**
 * Facture (CDC §4.10).
 *
 * Comme pour les factures proforma, aucun montant n'est transmis : le serveur recalcule
 * sous-total, remise, TVA et total à partir des lignes et du taux configuré
 * dans Paramètres. Ce que l'écran affiche pendant la saisie est une
 * estimation, signalée comme telle.
 */
export function InvoiceEditorModal({ open, onClose, invoice }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(invoice);

  const [customerId, setCustomerId] = useState("");
  const [contractId, setContractId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const products = useQuery({
    queryKey: [...QK.products, "for-select"],
    queryFn: () => productsService.list({ limit: 200 }),
    enabled: open,
  });

  const organization = useQuery({
    queryKey: [...QK.settings, "organization"],
    queryFn: () => settingsService.organization(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const vatRate = Number(organization.data?.vatRate ?? 0);

  useEffect(() => {
    if (!open) return;

    setCustomerId(String(invoice?.customerId ?? ""));
    setContractId(String(invoice?.contractId ?? ""));
    setDueDate(String(invoice?.dueDate ?? "").slice(0, 10));

    const existing = (invoice?.items as Row[]) ?? [];
    setLines(
      existing.length
        ? existing.map((item) => ({
            key: Math.random().toString(36).slice(2),
            description: String(item.description ?? ""),
            quantity: Number(item.quantity ?? 1),
            unitPrice: Number(item.unitPrice ?? 0),
            discount: Number(item.discount ?? 0),
            productId: item.productId ? String(item.productId) : undefined,
          }))
        : [emptyLine()],
    );
  }, [open, invoice]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        customerId,
        ...(contractId ? { contractId } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        items: lines
          .filter((line) => line.description.trim() && line.quantity > 0)
          .map((line) => ({
            description: line.description.trim(),
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            ...(Number(line.discount) ? { discount: Number(line.discount) } : {}),
            ...(line.productId ? { productId: line.productId } : {}),
          })),
      };

      return isEdit
        ? invoicesService.update(String(invoice!.id), body)
        : invoicesService.create(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Facture mise à jour" : "Facture créée");
      queryClient.invalidateQueries({ queryKey: QK.invoices });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function pickProduct(key: string, productId: string) {
    const product = (products.data?.data ?? []).find((p) => String(p.id) === productId);

    updateLine(key, {
      productId: productId || undefined,
      ...(product
        ? { description: String(product.name ?? ""), unitPrice: Number(product.price ?? 0) }
        : {}),
    });
  }

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
  const canSubmit = Boolean(customerId) && validLines.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Facture ${String(invoice?.number ?? "")}` : "Nouvelle facture"}
      description={
        isEdit ? undefined : "Le numéro est attribué automatiquement à l'enregistrement."
      }
      className="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" htmlFor="inv-customer" required>
            <EntitySelect
              id="inv-customer"
              service={customersService}
              queryKey={QK.customers}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              placeholder="Rechercher un client"
              render={(row) => ({
                label: String(row.companyName ?? ""),
                detail: String(row.code ?? ""),
              })}
            />
          </Field>

          <Field
            label="Contrat rattaché"
            htmlFor="inv-contract"
            hint="Facultatif — pour une facture émise au titre d'un contrat."
          >
            <EntitySelect
              id="inv-contract"
              service={contractsService}
              queryKey={QK.contracts}
              value={contractId}
              onChange={(id) => setContractId(id)}
              placeholder="Rechercher un contrat"
              render={(row) => ({
                label: `${String(row.number ?? "")} — ${String(row.title ?? "")}`,
                detail: formatMoney(row.amount as string),
              })}
            />
          </Field>

          <Field label="Échéance de règlement" htmlFor="inv-due">
            <Input
              id="inv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink">Lignes de facturation</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une ligne
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-left text-xs font-medium uppercase tracking-wide text-slate">
                  <th className="px-3 py-2">Produit</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="w-20 px-3 py-2 text-right">Qté</th>
                  <th className="w-32 px-3 py-2 text-right">P.U.</th>
                  <th className="w-28 px-3 py-2 text-right">Remise</th>
                  <th className="w-32 px-3 py-2 text-right">Total</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>

              <tbody>
                <AnimatePresence initial={false}>
                  {lines.map((line, index) => (
                    <motion.tr
                      key={line.key}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-3 py-2">
                        <Select
                          value={line.productId ?? ""}
                          onChange={(e) => pickProduct(line.key, e.target.value)}
                          aria-label={`Produit ligne ${index + 1}`}
                          className="min-w-[130px]"
                        >
                          <option value="">Libre</option>
                          {(products.data?.data ?? []).map((product) => (
                            <option key={String(product.id)} value={String(product.id)}>
                              {String(product.name)}
                            </option>
                          ))}
                        </Select>
                      </td>

                      <td className="px-3 py-2">
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(line.key, { description: e.target.value })}
                          placeholder="Désignation de la prestation"
                          aria-label={`Description ligne ${index + 1}`}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                          className="text-right"
                          aria-label={`Quantité ligne ${index + 1}`}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={line.unitPrice}
                          onChange={(e) =>
                            updateLine(line.key, { unitPrice: Number(e.target.value) })
                          }
                          className="text-right"
                          aria-label={`Prix unitaire ligne ${index + 1}`}
                        />
                      </td>

                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={line.discount}
                          onChange={(e) => updateLine(line.key, { discount: Number(e.target.value) })}
                          className="text-right"
                          aria-label={`Remise ligne ${index + 1}`}
                        />
                      </td>

                      <td className="px-3 py-2 text-right font-mono-tabular text-ink">
                        {formatMoney(
                          Number(line.quantity) * Number(line.unitPrice) -
                            (Number(line.discount) || 0),
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-alert hover:bg-alert/10"
                          disabled={lines.length === 1}
                          onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                          aria-label={`Supprimer la ligne ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        <div className="ml-auto w-full max-w-xs space-y-1.5 rounded-xl border border-line bg-paper p-4 text-sm">
          <div className="flex justify-between text-slate">
            <span>Sous-total</span>
            <span className="font-mono-tabular text-ink">{formatMoney(preview.subtotal)}</span>
          </div>
          {preview.discount > 0 && (
            <div className="flex justify-between text-slate">
              <span>Remise</span>
              <span className="font-mono-tabular text-ink">−{formatMoney(preview.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate">
            <span>TVA {organization.isPending ? "" : `(${(vatRate * 100).toFixed(0)} %)`}</span>
            <span className="font-mono-tabular text-ink">{formatMoney(preview.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5 font-display font-semibold text-ink">
            <span>Total TTC</span>
            <span className="font-mono-tabular">{formatMoney(preview.total)}</span>
          </div>
          <p className="pt-1 text-[11px] leading-snug text-slate">
            Estimation. Les montants définitifs sont calculés par le serveur à l'enregistrement.
          </p>
        </div>

        {/* Pas de signature sur une facture : elle constate une créance, elle
            ne l'engage pas — c'est le contrat ou le bon de commande qui le fait. */}
        {isEdit && invoice?.id && (
          <div className="space-y-4 border-t border-line pt-5">
            <InvoicePaymentsPanel invoice={invoice} />

            <CommentThread
              entityType="INVOICE"
              entityId={String(invoice.id)}
              emptyDetail="Notez ici une relance effectuée, un litige ou un accord de règlement."
            />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !canSubmit}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer la facture"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

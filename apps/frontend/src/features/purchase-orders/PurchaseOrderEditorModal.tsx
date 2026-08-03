import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, FileCheck2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { customersService, productsService, quotesService } from "@/services/resources";
import { http } from "@/services/api";
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
  productId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  purchaseOrder?: Row | null;
}

/** Moyens de règlement — repris de l'enum `PaymentMethod` du schéma. */
const PAYMENT_METHODS: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
  CARD: "Carte bancaire",
  MOBILE_MONEY: "Mobile Money",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
};

const emptyLine = (): Line => ({
  key: Math.random().toString(36).slice(2),
  description: "",
  quantity: 1,
  unitPrice: 0,
});

/**
 * Bon de commande (CDC §4.8).
 *
 * Deux chemins, et le premier est le chemin nominal : transformer un devis
 * accepté, ce que le backend fait en une requête via
 * `POST /purchase-orders/from-quote/:quoteId` — il recopie lignes et montants
 * depuis le devis, donc rien n'est ressaisi et rien ne peut diverger.
 *
 * La saisie libre existe pour les commandes sans devis préalable.
 */
export function PurchaseOrderEditorModal({ open, onClose, purchaseOrder }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(purchaseOrder);

  const [mode, setMode] = useState<"from-quote" | "manual">("from-quote");
  const [quoteId, setQuoteId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const products = useQuery({
    queryKey: ["products", "for-select"],
    queryFn: () => productsService.list({ limit: 200 }),
    enabled: open && mode === "manual",
  });

  // Aperçu du devis choisi : montrer ce qui sera repris évite de convertir
  // le mauvais devis sans s'en apercevoir.
  const quotePreview = useQuery({
    queryKey: [...QK.quotes, "preview", quoteId],
    queryFn: () => quotesService.get(quoteId),
    enabled: open && mode === "from-quote" && Boolean(quoteId),
  });

  useEffect(() => {
    if (!open) return;

    // L'édition ne porte que sur le mode de règlement : les lignes d'un bon
    // de commande émis ne se retouchent pas à la volée.
    setMode(isEdit ? "manual" : "from-quote");
    setQuoteId("");
    setCustomerId(String(purchaseOrder?.customerId ?? ""));
    setPaymentMethod(String(purchaseOrder?.paymentMethod ?? ""));
    setLines([emptyLine()]);
  }, [open, purchaseOrder, isEdit]);

  const save = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return http.patch(`/purchase-orders/${String(purchaseOrder!.id)}`, {
          ...(paymentMethod ? { paymentMethod } : {}),
        });
      }

      if (mode === "from-quote") {
        return http.post(`/purchase-orders/from-quote/${quoteId}`, {
          ...(paymentMethod ? { paymentMethod } : {}),
        });
      }

      return http.post("/purchase-orders", {
        customerId,
        ...(paymentMethod ? { paymentMethod } : {}),
        items: lines
          .filter((line) => line.description.trim() && line.quantity > 0)
          .map((line) => ({
            description: line.description.trim(),
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            ...(line.productId ? { productId: line.productId } : {}),
          })),
      });
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? "Bon de commande mis à jour"
          : mode === "from-quote"
            ? "Bon de commande créé depuis le devis"
            : "Bon de commande créé",
      );
      queryClient.invalidateQueries({ queryKey: QK.purchaseOrders });
      queryClient.invalidateQueries({ queryKey: QK.quotes });
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

  /**
   * Estimation locale. Le montant qui fait foi est celui que le serveur
   * calcule — en conversion, il reprend même directement le total du devis.
   */
  const estimate = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
        0,
      ),
    [lines],
  );

  const validLines = lines.filter((line) => line.description.trim() && line.quantity > 0);
  const canSubmit = isEdit
    ? true
    : mode === "from-quote"
      ? Boolean(quoteId)
      : Boolean(customerId) && validLines.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? `Bon de commande ${String(purchaseOrder?.number ?? "")}`
          : "Nouveau bon de commande"
      }
      description={
        isEdit
          ? "Seul le mode de règlement reste modifiable après émission."
          : "La référence est attribuée automatiquement à l'enregistrement."
      }
      className="max-w-4xl"
    >
      <div className="space-y-5">
        {!isEdit && (
          <div className="flex gap-2 rounded-xl border border-line bg-paper p-1">
            {(
              [
                ["from-quote", "Depuis un devis accepté"],
                ["manual", "Saisie libre"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === value ? "bg-surface text-ink shadow-e1" : "text-slate hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {!isEdit && mode === "from-quote" && (
          <div className="space-y-4">
            <Field
              label="Devis à transformer"
              htmlFor="po-quote"
              required
              hint="Seuls les devis acceptés peuvent être transformés."
            >
              <EntitySelect
                id="po-quote"
                service={quotesService}
                queryKey={QK.quotes}
                value={quoteId}
                onChange={(id) => setQuoteId(id)}
                placeholder="Rechercher un devis par numéro ou objet"
                render={(row) => ({
                  label: `${String(row.number ?? "")} — ${String(row.title ?? "")}`,
                  detail: formatMoney(row.total as string),
                })}
              />
            </Field>

            <AnimatePresence>
              {quotePreview.data && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.24, ease: EASE_OUT }}
                  className="rounded-xl border border-line bg-surface p-4"
                >
                  <div className="mb-3 flex items-center gap-2 text-sm text-slate">
                    <FileCheck2 className="h-4 w-4 text-wire" />
                    <span>Lignes reprises depuis le devis</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span className="text-ink">bon de commande</span>
                  </div>

                  <ul className="space-y-1.5 text-sm">
                    {((quotePreview.data.items as Row[]) ?? []).map((item, index) => (
                      <li key={index} className="flex justify-between gap-4 text-slate">
                        <span className="truncate">
                          {String(item.description ?? "")} × {String(item.quantity ?? "")}
                        </span>
                        <span className="shrink-0 font-mono-tabular text-ink">
                          {formatMoney(item.total as string)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex justify-between border-t border-line pt-2 font-display text-sm font-semibold text-ink">
                    <span>Montant du bon de commande</span>
                    <span className="font-mono-tabular">
                      {formatMoney(quotePreview.data.total as string)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!isEdit && mode === "manual" && (
          <>
            <Field label="Client" htmlFor="po-customer" required>
              <EntitySelect
                id="po-customer"
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-ink">
                  Lignes de la commande
                </h3>
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
                              placeholder="Désignation"
                              aria-label={`Description ligne ${index + 1}`}
                            />
                          </td>

                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.key, { quantity: Number(e.target.value) })
                              }
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

                          <td className="px-3 py-2 text-right font-mono-tabular text-ink">
                            {formatMoney(Number(line.quantity) * Number(line.unitPrice))}
                          </td>

                          <td className="px-3 py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-alert hover:bg-alert/10"
                              disabled={lines.length === 1}
                              onClick={() =>
                                setLines((prev) => prev.filter((l) => l.key !== line.key))
                              }
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

              <div className="mt-3 flex justify-end">
                <div className="w-full max-w-xs rounded-xl border border-line bg-paper p-3 text-sm">
                  <div className="flex justify-between font-display font-semibold text-ink">
                    <span>Montant estimé</span>
                    <span className="font-mono-tabular">{formatMoney(estimate)}</span>
                  </div>
                  <p className="pt-1 text-[11px] leading-snug text-slate">
                    Le montant définitif est calculé par le serveur.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <Field
          label="Mode de règlement"
          htmlFor="po-payment"
          hint="Peut être renseigné plus tard, à la signature."
        >
          <Select
            id="po-payment"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="">Non précisé</option>
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !canSubmit}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer le bon de commande"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

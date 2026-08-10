import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Check,
  Coins,
  Package,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/DataState";

import { settingsService, productsService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { QK } from "@/config/constants";
import { EASE_OUT } from "@/lib/motion";
import { formatMoney } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };
type Tab = "organization" | "products" | "sectors" | "countries" | "currencies";

const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: "organization", label: "Organisation", icon: Building2 },
  { key: "products", label: "Produits", icon: Package },
  { key: "sectors", label: "Secteurs", icon: Tags },
  { key: "countries", label: "Pays", icon: Globe2 },
  { key: "currencies", label: "Devises", icon: Coins },
];

export function SettingsPage() {
  const isSuperAdmin = useAuthStore((s) => s.user?.role?.name === "SUPER_ADMIN");
  const [tab, setTab] = useState<Tab>("organization");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Paramètres</h1>
        <p className="mt-1 text-sm text-slate">
          {isSuperAdmin
            ? "Configuration de l'organisation et des référentiels du CRM."
            : "Configuration consultable. Les modifications sont réservées au Super administrateur."}
        </p>
      </header>

      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-paper p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-surface text-ink shadow-e1" : "text-slate hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "organization" ? (
        <OrganizationPanel canEdit={isSuperAdmin} />
      ) : tab === "products" ? (
        <ProductsPanel canEdit={isSuperAdmin} />
      ) : (
        <ReferencePanel key={tab} kind={tab} canEdit={isSuperAdmin} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Organisation
// ---------------------------------------------------------------------------

function OrganizationPanel({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: [...QK.settings, "organization"],
    queryFn: () => settingsService.organization(),
  });

  useEffect(() => {
    if (!query.data) return;

    setForm({
      companyName: String(query.data.companyName ?? ""),
      address: String(query.data.address ?? ""),
      email: String(query.data.email ?? ""),
      phone: String(query.data.phone ?? ""),
      logoUrl: String(query.data.logoUrl ?? ""),
      // Le backend stocke un ratio (0,18) ; on présente un pourcentage.
      vatRate: String(Number(query.data.vatRate ?? 0) * 100),
      defaultCurrency: String(query.data.defaultCurrency ?? ""),
    });
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(form)) {
        if (value === "") continue;
        body[key] = key === "vatRate" ? Number(value) / 100 : value;
      }

      return settingsService.updateOrganization(body);
    },
    onSuccess: () => {
      toast.success("Paramètres enregistrés");
      // Le taux de TVA alimente l'estimation des factures proforma et factures : leurs
      // écrans doivent repartir sur la nouvelle valeur.
      queryClient.invalidateQueries({ queryKey: QK.settings });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  if (query.isPending) {
    return (
      <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />;
  }

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Raison sociale" htmlFor="s-name">
            <Input
              id="s-name"
              value={form.companyName ?? ""}
              onChange={(e) => set("companyName", e.target.value)}
              disabled={!canEdit}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Adresse" htmlFor="s-address">
            <Input
              id="s-address"
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              disabled={!canEdit}
            />
          </Field>
        </div>

        <Field label="E-mail" htmlFor="s-email">
          <Input
            id="s-email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            disabled={!canEdit}
          />
        </Field>

        <Field label="Téléphone" htmlFor="s-phone">
          <Input
            id="s-phone"
            value={form.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            disabled={!canEdit}
          />
        </Field>

        <Field
          label="Taux de TVA (%)"
          htmlFor="s-vat"
          hint="Appliqué au calcul des factures proforma et des factures."
        >
          <Input
            id="s-vat"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={form.vatRate ?? ""}
            onChange={(e) => set("vatRate", e.target.value)}
            disabled={!canEdit}
          />
        </Field>

        <Field
          label="Devise par défaut"
          htmlFor="s-currency"
          hint="Code ISO — FCFA correspond à XOF."
        >
          <Input
            id="s-currency"
            value={form.defaultCurrency ?? ""}
            onChange={(e) => set("defaultCurrency", e.target.value)}
            disabled={!canEdit}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Logo (URL)" htmlFor="s-logo" hint="Affiché sur les factures proforma et factures PDF.">
            <Input
              id="s-logo"
              value={form.logoUrl ?? ""}
              onChange={(e) => set("logoUrl", e.target.value)}
              disabled={!canEdit}
            />
          </Field>
        </div>
      </div>

      {canEdit && (
        <div className="mt-6 flex justify-end border-t border-line pt-4">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Référentiels — secteurs, pays, devises
// ---------------------------------------------------------------------------

/**
 * Les trois référentiels partagent le même écran : une liste, un ajout en
 * ligne, une édition sur place. Seuls leurs champs diffèrent — d'où cette
 * table de configuration plutôt que trois panneaux quasi identiques.
 */
const REFERENCE_CONFIG = {
  sectors: {
    label: "secteur",
    plural: "Secteurs d'activité",
    detail: "Utilisés pour classer clients et prospects, et pour le reporting sectoriel.",
    fields: [{ key: "name", label: "Libellé", placeholder: "Télécommunications" }],
    load: () => settingsService.sectors(),
    create: (body: Row) => settingsService.createSector(body),
    update: (id: string, body: Row) => settingsService.updateSector(id, body),
    remove: (id: string) => settingsService.removeSector(id),
  },
  countries: {
    label: "pays",
    plural: "Pays",
    detail: "Servent au ciblage des campagnes et au reporting par zone.",
    fields: [
      { key: "name", label: "Nom", placeholder: "Côte d'Ivoire" },
      { key: "code", label: "Code ISO (2 lettres)", placeholder: "CI" },
    ],
    load: () => settingsService.countries(),
    create: (body: Row) => settingsService.createCountry(body),
    update: (id: string, body: Row) => settingsService.updateCountry(id, body),
    remove: (id: string) => settingsService.removeCountry(id),
  },
  currencies: {
    label: "devise",
    plural: "Devises",
    detail: "Le FCFA (XOF) est la devise de référence ; les autres sont converties.",
    fields: [
      { key: "code", label: "Code", placeholder: "XOF" },
      { key: "name", label: "Nom", placeholder: "Franc CFA" },
      { key: "exchangeRate", label: "Taux de change", placeholder: "1" },
    ],
    load: () => settingsService.currencies(),
    create: (body: Row) => settingsService.createCurrency(body),
    update: (id: string, body: Row) => settingsService.updateCurrency(id, body),
    remove: (id: string) => settingsService.removeCurrency(id),
  },
} as const;

function ReferencePanel({
  kind,
  canEdit,
}: {
  kind: "sectors" | "countries" | "currencies";
  canEdit: boolean;
}) {
  const config = REFERENCE_CONFIG[kind];
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const queryKey = [...QK.settings, kind];

  const query = useQuery({ queryKey, queryFn: () => config.load() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const create = useMutation({
    mutationFn: () => {
      const body: Row = {};
      for (const field of config.fields) {
        const value = draft[field.key];
        if (!value) continue;
        body[field.key] = field.key === "exchangeRate" ? Number(value) : value;
      }
      return config.create(body);
    },
    onSuccess: () => {
      setDraft({});
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const update = useMutation({
    mutationFn: (id: string) => {
      const body: Row = {};
      for (const field of config.fields) {
        const value = editDraft[field.key];
        if (value === undefined || value === "") continue;
        body[field.key] = field.key === "exchangeRate" ? Number(value) : value;
      }
      return config.update(id, body);
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => config.remove(id),
    onSuccess: () => {
      toast.success(`${config.label.charAt(0).toUpperCase()}${config.label.slice(1)} supprimé`);
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const items = (query.data as Row[] | undefined) ?? [];
  const canCreate = config.fields
    .filter((field) => field.key !== "exchangeRate")
    .every((field) => (draft[field.key] ?? "").trim());

  return (
    <div className="rounded-xl border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <h2 className="font-display text-sm font-semibold text-ink">{config.plural}</h2>
        <p className="mt-0.5 text-xs text-slate">{config.detail}</p>
      </header>

      {canEdit && (
        <div className="flex flex-wrap items-end gap-3 border-b border-line bg-paper/50 px-5 py-4">
          {config.fields.map((field) => (
            <div key={field.key} className="min-w-[140px] flex-1">
              <label
                htmlFor={`new-${field.key}`}
                className="mb-1.5 block text-xs font-medium text-slate"
              >
                {field.label}
              </label>
              <Input
                id={`new-${field.key}`}
                value={draft[field.key] ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) create.mutate();
                }}
              />
            </div>
          ))}

          <Button onClick={() => create.mutate()} disabled={create.isPending || !canCreate}>
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Ajouter
          </Button>
        </div>
      )}

      {query.isPending ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="p-5">
          <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate">
          Aucun {config.label} enregistré pour l'instant.
        </p>
      ) : (
        <ul>
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const id = String(item.id);
              const isEditing = editingId === id;

              return (
                <motion.li
                  key={id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0"
                >
                  {isEditing ? (
                    <>
                      {config.fields.map((field) => (
                        <Input
                          key={field.key}
                          value={editDraft[field.key] ?? ""}
                          onChange={(e) =>
                            setEditDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          aria-label={field.label}
                          className="max-w-[200px]"
                        />
                      ))}

                      <div className="ml-auto flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => update.mutate(id)}
                          disabled={update.isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-ink">{String(item.name ?? item.code ?? "")}</span>

                      {kind !== "sectors" && item.code !== undefined && item.name !== undefined && (
                        <span className="font-mono-tabular text-xs text-slate">
                          {String(item.code)}
                        </span>
                      )}

                      {kind === "currencies" && item.isBase === true && (
                        <Badge tone="wire">Devise de référence</Badge>
                      )}

                      {item.isActive === false && <Badge tone="neutral">Inactif</Badge>}

                      {canEdit && (
                        <div className="ml-auto flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(id);
                              setEditDraft(
                                Object.fromEntries(
                                  config.fields.map((field) => [
                                    field.key,
                                    String(item[field.key] ?? ""),
                                  ]),
                                ),
                              );
                            }}
                            aria-label={`Modifier ${String(item.name ?? item.code ?? "")}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-alert hover:bg-alert/10"
                            onClick={() => remove.mutate(id)}
                            disabled={remove.isPending}
                            aria-label={`Supprimer ${String(item.name ?? item.code ?? "")}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalogue produits
// ---------------------------------------------------------------------------

/**
 * Catalogue des offres (CDC §4.5).
 *
 * Rattaché aux Paramètres plutôt qu'à un module séparé : c'est un
 * référentiel qu'on configure une fois et qu'on ajuste rarement, comme les
 * secteurs ou les factures proformaes. L'écriture est ouverte à l'Admin ventes en plus
 * du Super Admin — c'est lui qui pilote le catalogue commercial.
 */
function ProductsPanel({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role?.name);
  const mayWrite = canEdit || role === "ADMIN_VENTES";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const query = useQuery({
    queryKey: [...QK.products, "settings"],
    queryFn: () => productsService.list({ limit: 200 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.products });

  const create = useMutation({
    mutationFn: () =>
      productsService.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        price: Number(price) || 0,
        ...(description.trim() ? { description: description.trim() } : {}),
      } as never),
    onSuccess: () => {
      toast.success("Produit ajouté au catalogue");
      setName("");
      setCode("");
      setPrice("");
      setDescription("");
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const toggleActive = useMutation({
    mutationFn: (product: Row) =>
      productsService.update(String(product.id), {
        isActive: product.isActive === false,
      } as never),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      toast.success("Produit retiré");
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const products = query.data?.data ?? [];
  const canCreate = name.trim().length > 1 && code.trim().length > 1 && Number(price) > 0;

  return (
    <div className="rounded-xl border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <h2 className="font-display text-sm font-semibold text-ink">Catalogue produits</h2>
        <p className="mt-0.5 text-xs text-slate">
          SMS Marketing, OTP, API SMS, WhatsApp, Voice… Les prix servent de base aux factures proforma et
          aux factures, où ils restent modifiables ligne par ligne.
        </p>
      </header>

      {mayWrite && (
        <div className="flex flex-wrap items-end gap-3 border-b border-line bg-paper/50 px-5 py-4">
          <div className="min-w-[180px] flex-1">
            <Field label="Nom" htmlFor="p-name" required>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SMS Marketing"
              />
            </Field>
          </div>

          <Field label="Code" htmlFor="p-code" required hint="Unique.">
            <Input
              id="p-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SMS-MKT"
              className="w-32"
            />
          </Field>

          <Field label="Prix unitaire (FCFA)" htmlFor="p-price" required>
            <Input
              id="p-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-36"
            />
          </Field>

          <Button onClick={() => create.mutate()} disabled={create.isPending || !canCreate}>
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Ajouter
          </Button>
        </div>
      )}

      {query.isPending ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="p-5">
          <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
        </div>
      ) : products.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate">
          Aucun produit au catalogue. Les factures proforma et campagnes s'appuient dessus : commencez par
          en créer un.
        </p>
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                <th className="px-5 py-3">Produit</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3 text-right">Prix unitaire</th>
                <th className="px-5 py-3">État</th>
                {mayWrite && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const active = product.isActive !== false;

                return (
                  <tr
                    key={String(product.id)}
                    className={`border-b border-line last:border-0 ${active ? "" : "opacity-60"}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{String(product.name ?? "")}</p>
                      {product.description ? (
                        <p className="text-xs text-slate">{String(product.description)}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 font-mono-tabular text-xs text-slate">
                      {String(product.code ?? "")}
                    </td>
                    <td className="px-5 py-3 text-right font-mono-tabular text-ink">
                      {formatMoney(product.price as number)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={active ? "signal" : "neutral"}>
                        {active ? "Actif" : "Retiré de la vente"}
                      </Badge>
                    </td>
                    {mayWrite && (
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {/* Désactiver plutôt que supprimer : un produit
                              retiré reste référencé par les factures proforma et factures
                              déjà émis. */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleActive.mutate(product)}
                            disabled={toggleActive.isPending}
                          >
                            {active ? "Retirer" : "Réactiver"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-alert hover:bg-alert/10"
                            onClick={() => remove.mutate(String(product.id))}
                            disabled={remove.isPending}
                            aria-label={`Supprimer ${String(product.name ?? "")}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

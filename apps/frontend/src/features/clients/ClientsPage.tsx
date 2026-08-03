import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, History, Plus, Search, SlidersHorizontal, Trash2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/DataState";

import { CustomerFormModal } from "./CustomerFormModal";
import { CustomerTimeline } from "@/features/communications/CustomerTimeline";
import { CUSTOMER_STATUS_LABELS, CUSTOMER_STATUS_TONES } from "./customer-status";

import { customersService } from "@/services/resources";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { QK, DEFAULT_PAGE_SIZE } from "@/config/constants";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatDate, formatMoney, initials } from "@/lib/format";
import type { ApiError, Customer, CustomerInput, CustomerStatus } from "@/types/api";

export function ClientsPage() {
  const reduced = usePrefersReducedMotion();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [timelineFor, setTimelineFor] = useState<Customer | null>(null);

  const debouncedSearch = useDebounced(search, 350);

  // `FilterCustomerDto` n'accepte que ces quatre filtres et le backend tourne
  // avec forbidNonWhitelisted : envoyer un paramètre de plus renvoie un 400.
  const params = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status ? { status } : {}),
      ...(country ? { country } : {}),
    }),
    [page, debouncedSearch, status, country],
  );

  const query = useResourceList<Customer>(QK.customers, customersService, params);
  const { create, update, remove, isBusy } = useResourceMutations<Customer>(
    QK.customers,
    customersService,
    {
      created: "Client créé",
      updated: "Client mis à jour",
      deleted: "Client supprimé",
    },
  );

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;

  const hasFilters = Boolean(debouncedSearch || status || country);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setFormOpen(true);
  }

  async function submitForm(values: CustomerInput) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, body: values as never });
    } else {
      await create.mutateAsync(values as never);
    }
    setFormOpen(false);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await remove.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setCountry("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Clients</h1>
          <p className="mt-1 text-sm text-slate">
            {query.isPending
              ? "Chargement du portefeuille…"
              : `${total} client${total > 1 ? "s" : ""} au portefeuille`}
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </header>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par raison sociale, référence ou e-mail"
            className="pl-9"
            aria-label="Rechercher un client"
          />
        </div>

        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CustomerStatus | "");
            setPage(1);
          }}
          className="w-auto min-w-[150px]"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Input
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setPage(1);
          }}
          placeholder="Pays"
          className="w-auto min-w-[140px]"
          aria-label="Filtrer par pays"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <SlidersHorizontal className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Contenu */}
      {query.isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="Aucun client ne correspond"
            detail="Élargissez la recherche ou retirez un filtre pour voir plus de résultats."
            action={
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="Le portefeuille est vide"
            detail="Créez votre premier client pour commencer à suivre ses opportunités, ses commandes et sa facturation."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nouveau client
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Secteur</th>
                  <th className="px-4 py-3">Localisation</th>
                  <th className="px-4 py-3">Chargé de compte</th>
                  <th className="px-4 py-3 text-right">Solde</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <motion.tbody
                variants={reduced ? undefined : staggerContainer}
                initial="initial"
                animate="animate"
                key={page}
              >
                {rows.map((customer) => (
                  <motion.tr
                    key={customer.id}
                    variants={reduced ? undefined : staggerItem}
                    className="border-b border-line last:border-0 transition-colors hover:bg-paper/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{customer.companyName}</div>
                      <div className="font-mono-tabular text-xs text-slate">{customer.code}</div>
                    </td>

                    <td className="px-4 py-3 text-slate">{customer.sector || "—"}</td>

                    <td className="px-4 py-3 text-slate">
                      {[customer.city, customer.country].filter(Boolean).join(", ") || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {customer.assignedTo ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-wire/10 text-[10px] font-semibold text-wire">
                            {initials(customer.assignedTo.firstName, customer.assignedTo.lastName)}
                          </span>
                          <span className="text-ink">
                            {customer.assignedTo.firstName} {customer.assignedTo.lastName}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate">Non assigné</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono-tabular text-ink">
                      {formatMoney(customer.walletBalance)}
                    </td>

                    <td className="px-4 py-3">
                      <Badge tone={CUSTOMER_STATUS_TONES[customer.status]}>
                        {CUSTOMER_STATUS_LABELS[customer.status]}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTimelineFor(customer)}
                          aria-label={`Historique de ${customer.companyName}`}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(customer)}
                          aria-label={`Modifier ${customer.companyName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToDelete(customer)}
                          aria-label={`Supprimer ${customer.companyName}`}
                          className="text-alert hover:bg-alert/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>

          {/* Pagination — masquée tant qu'il n'y a qu'une page */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <p className="text-xs text-slate">
                Page {page} sur {totalPages} · créé le {formatDate(rows[0]?.createdAt)} pour le plus récent
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages || query.isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editing}
        onSubmit={submitForm}
        pending={create.isPending || update.isPending}
        error={(editing ? update.error : create.error) as ApiError | null}
      />

      <Modal
        open={Boolean(timelineFor)}
        onClose={() => setTimelineFor(null)}
        title={timelineFor?.companyName ?? ""}
        description="Tous les échanges avec ce client, du plus récent au plus ancien."
        className="max-w-3xl"
      >
        {timelineFor && <CustomerTimeline customerId={timelineFor.id} />}
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer ce client ?"
        description={toDelete?.companyName}
      >
        <p className="text-sm leading-relaxed text-slate">
          Le schéma est en suppression en cascade : les opportunités, devis, bons de commande,
          contrats, factures et encaissements rattachés à ce client seront{" "}
          <strong className="text-alert">définitivement supprimés</strong> avec lui. Cette action
          est irréversible.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)} disabled={isBusy}>
            Annuler
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={isBusy}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

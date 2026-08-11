import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { Can } from "@/components/shared/Can";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Field";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { CustomerFormModal } from "@/features/clients/CustomerFormModal";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { formatCFA, initials } from "@/lib/utils";
import {
  CUSTOMERS_QUERY_KEY,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  createCustomer,
  fetchCustomers,
  setCustomerStatus,
  updateCustomer,
  type Customer,
  type CustomerPayload,
  type CustomerStatus,
} from "@/services/customers";
import { dealAmount, fetchDealsByCustomer } from "@/services/pipeline";

const STATUS_TONES: Record<CustomerStatus, "signal" | "neutral" | "amber"> = {
  ACTIVE: "signal",
  INACTIVE: "neutral",
  SUSPENDED: "amber",
};

export function ClientsPage() {
  const queryClient = useQueryClient();
  const { allowed: canWrite, reason: denial } = usePermission("clients", "ecriture");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; customer: Customer | null }>({
    open: false,
    customer: null,
  });

  const debouncedSearch = useDebouncedValue(search);

  const customers = useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, { page, search: debouncedSearch, status }],
    queryFn: () =>
      fetchCustomers({
        page,
        search: debouncedSearch,
        ...(status ? { status } : {}),
      }),
    // La page précédente reste affichée pendant le chargement de la suivante :
    // sans cela, chaque frappe fait clignoter le tableau vers un état de
    // chargement.
    placeholderData: keepPreviousData,
  });

  const rows = customers.data?.data;
  const selected = rows?.find((customer) => customer.id === selectedId) ?? null;

  /** Rechargement de toutes les pages, dont celle affichée. */
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });

  const save = useMutation({
    mutationFn: ({
      customer,
      payload,
    }: {
      customer: Customer | null;
      payload: CustomerPayload;
    }) => (customer ? updateCustomer(customer.id, payload) : createCustomer(payload)),
    onSuccess: () => void refresh(),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: CustomerStatus }) =>
      setCustomerStatus(id, next),
    onSuccess: () => void refresh(),
  });

  /** Toute nouvelle recherche ou tout nouveau filtre ramène à la première page. */
  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value as CustomerStatus | "");
    setPage(1);
  }

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-text">Clients</h1>
            <p className="mt-1 text-sm text-muted">
              {customers.data
                ? `${customers.data.total} entreprise${customers.data.total > 1 ? "s" : ""}`
                : "Chargement…"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                placeholder="Raison sociale, référence, e-mail…"
                className="pl-9"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                aria-label="Rechercher un client"
              />
            </div>

            <Select
              className="w-40"
              value={status}
              onChange={(event) => updateStatus(event.target.value)}
              aria-label="Filtrer par statut"
            >
              <option value="">Tous les statuts</option>
              {CUSTOMER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {CUSTOMER_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>

            <Can domain="clients">
              <Button onClick={() => setForm({ open: true, customer: null })}>
                <Plus className="h-4 w-4" />
                Nouveau client
              </Button>
            </Can>
          </div>
        </div>

        {!canWrite && (
          <p className="text-xs text-muted">{denial} La liste est en lecture seule.</p>
        )}

        <AsyncBoundary
          isLoading={customers.isPending}
          error={customers.error}
          data={customers.data}
          onRetry={() => void customers.refetch()}
        >
          {(pageData) =>
            pageData.data.length === 0 ? (
              <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
                <p className="text-sm font-semibold text-text">
                  {debouncedSearch || status
                    ? "Aucun client ne correspond à cette recherche."
                    : "Aucun client enregistré."}
                </p>
                <p className="max-w-md text-sm text-muted">
                  {debouncedSearch || status
                    ? "Modifiez les critères ou effacez le filtre."
                    : "Créez le premier client pour commencer à suivre son portefeuille."}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Entreprise</Th>
                      <Th>Secteur</Th>
                      <Th>Pays</Th>
                      <Th>Commercial</Th>
                      <Th>Statut</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {pageData.data.map((customer) => (
                      <Tr
                        key={customer.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(customer.id)}
                      >
                        <Td>
                          <span className="font-medium">{customer.companyName}</span>
                          <span className="ml-2 font-mono-tabular text-xs text-muted">
                            {customer.code}
                          </span>
                        </Td>
                        <Td className="text-muted">{customer.sector ?? "—"}</Td>
                        <Td className="text-muted">{customer.country ?? "—"}</Td>
                        <Td className="text-muted">
                          {customer.assignedTo
                            ? `${customer.assignedTo.firstName} ${customer.assignedTo.lastName}`
                            : "Non affecté"}
                        </Td>
                        <Td>
                          <Badge tone={STATUS_TONES[customer.status]}>
                            {CUSTOMER_STATUS_LABELS[customer.status]}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>

                {pageData.totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">
                      Page {pageData.page} sur {pageData.totalPages} ·{" "}
                      {pageData.total} client{pageData.total > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pageData.page <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Précédent
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pageData.page >= pageData.totalPages}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Suivant
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )
          }
        </AsyncBoundary>
      </div>

      {selected && (
        <CustomerPanel
          customer={selected}
          canWrite={canWrite}
          statusPending={changeStatus.isPending}
          onClose={() => setSelectedId(null)}
          onEdit={() => setForm({ open: true, customer: selected })}
          onToggleStatus={() =>
            changeStatus.mutate({
              id: selected.id,
              next: selected.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
            })
          }
        />
      )}

      <CustomerFormModal
        open={form.open}
        customer={form.customer}
        onClose={() => setForm({ open: false, customer: null })}
        onSubmit={(payload) =>
          save.mutateAsync({ customer: form.customer, payload })
        }
      />
    </div>
  );
}

interface CustomerPanelProps {
  customer: Customer;
  canWrite: boolean;
  statusPending: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
}

/**
 * Fiche client.
 *
 * Les opportunités affichées viennent de `GET /deals?customerId=` : elles sont
 * rattachées en base, et non retrouvées par correspondance de nom comme le
 * faisait la version sur données fictives — deux clients homonymes s'y
 * seraient partagé les mêmes affaires.
 */
function CustomerPanel({
  customer,
  canWrite,
  statusPending,
  onClose,
  onEdit,
  onToggleStatus,
}: CustomerPanelProps) {
  const deals = useQuery({
    queryKey: ["deals", "by-customer", customer.id],
    queryFn: () => fetchDealsByCustomer(customer.id),
  });

  const isActive = customer.status === "ACTIVE";

  return (
    <Card className="h-fit w-80 shrink-0 p-0">
      <div className="flex items-start justify-between border-b border-border p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 font-display text-sm font-semibold text-accent">
            {initials(customer.companyName)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-text">
              {customer.companyName}
            </p>
            <p className="font-mono-tabular text-xs text-muted">{customer.code}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted transition-colors hover:bg-bg hover:text-text"
          aria-label="Fermer la fiche client"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={STATUS_TONES[customer.status]}>
            {CUSTOMER_STATUS_LABELS[customer.status]}
          </Badge>
          {customer.sector && <span className="text-xs text-muted">{customer.sector}</span>}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {[customer.city, customer.country].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customer.email ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customer.phone ?? "—"}</span>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">Commercial</p>
          <p className="text-sm text-text">
            {customer.assignedTo
              ? `${customer.assignedTo.firstName} ${customer.assignedTo.lastName}`
              : "Non affecté"}
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">
            Opportunités liées
          </p>

          {deals.isPending && <p className="text-xs text-muted">Chargement…</p>}

          {deals.error && (
            <p className="text-xs text-danger">
              Opportunités indisponibles pour le moment.
            </p>
          )}

          {deals.data?.length === 0 && (
            <p className="text-xs text-muted">Aucune opportunité rattachée.</p>
          )}

          {deals.data && deals.data.length > 0 && (
            <div className="space-y-2">
              {deals.data.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-text">{deal.title}</span>
                  <span className="shrink-0 font-mono-tabular text-muted">
                    {formatCFA(dealAmount(deal))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border pt-4">
          <Can domain="clients">
            <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
          </Can>
          <Can domain="clients">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={!canWrite || statusPending}
              onClick={onToggleStatus}
            >
              {isActive ? (
                <>
                  <Archive className="h-3.5 w-3.5" />
                  Archiver
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réactiver
                </>
              )}
            </Button>
          </Can>
        </div>
      </div>
    </Card>
  );
}

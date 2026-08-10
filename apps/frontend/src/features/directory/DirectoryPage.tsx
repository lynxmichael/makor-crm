import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookUser,
  Building2,
  Globe2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { DirectoryImportModal } from "./DirectoryImportModal";
import { DirectoryEntryModal } from "./DirectoryEntryModal";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { http } from "@/services/api";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiError, Paginated } from "@/types/api";

interface Entry {
  id: string;
  kind: "CONTACT" | "LEAD";
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  sector: string | null;
  customerId: string | null;
  assignedTo: { firstName: string; lastName: string } | null;
  status: string | null;
}

/**
 * Annuaire unifié (demande du 05/08/2026).
 *
 * Rassemble contacts clients et prospects sur un même écran. C'est un
 * répertoire partagé : chacun y retrouve un interlocuteur, même s'il n'en a
 * pas la charge — à la différence du portefeuille, qui reste cloisonné.
 */
export function DirectoryPage() {
  const reduced = usePrefersReducedMotion();

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [kind, setKind] = useState<"" | "CONTACT" | "LEAD">("");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Entry | null>(null);
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounced(search, 350);

  const params = useMemo(
    () => ({
      page,
      limit: 25,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(country ? { country } : {}),
      ...(kind ? { kind } : {}),
    }),
    [page, debouncedSearch, country, kind],
  );

  const query = useQuery({
    queryKey: ["directory", params],
    queryFn: () => http.get<Paginated<Entry>>("/directory", { params }),
  });

  const countries = useQuery({
    queryKey: ["directory", "countries"],
    queryFn: () => http.get<{ country: string; count: number }[]>("/directory/countries"),
  });

  const remove = useMutation({
    mutationFn: (entry: Entry) => http.delete(`/directory/${entry.kind}/${entry.id}`),
    onSuccess: () => {
      toast.success("Entrée supprimée");
      queryClient.invalidateQueries({ queryKey: ["directory"] });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasFilters = Boolean(debouncedSearch || country || kind);

  function resetFilters() {
    setSearch("");
    setCountry("");
    setKind("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Annuaire</h1>
          <p className="mt-1 text-sm text-slate">
            Contacts clients et prospects réunis. Répertoire partagé, consultable par toute
            l'équipe.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importer un fichier
          </Button>
          <Button onClick={() => setEntryOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </header>

      {/* Répartition par pays — cliquable, plus rapide qu'un menu déroulant
          quand on cherche « qui avons-nous au Sénégal ». */}
      {(countries.data ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCountry("");
              setPage(1);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              country === ""
                ? "border-wire bg-wire/10 text-wire"
                : "border-line bg-surface text-slate hover:text-ink",
            )}
          >
            Tous les pays
          </button>

          {(countries.data ?? []).map((entry) => (
            <button
              key={entry.country}
              type="button"
              onClick={() => {
                setCountry(entry.country);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                country === entry.country
                  ? "border-wire bg-wire/10 text-wire"
                  : "border-line bg-surface text-slate hover:text-ink",
              )}
            >
              <Globe2 className="h-3.5 w-3.5" />
              {entry.country}
              <span className="font-mono-tabular text-xs opacity-70">{entry.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par nom, e-mail, téléphone ou entreprise"
            className="pl-9"
            aria-label="Rechercher dans l'annuaire"
          />
        </div>

        <Select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as "" | "CONTACT" | "LEAD");
            setPage(1);
          }}
          className="w-auto min-w-[160px]"
          aria-label="Filtrer par type"
        >
          <option value="">Contacts et prospects</option>
          <option value="CONTACT">Contacts clients</option>
          <option value="LEAD">Prospects</option>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Réinitialiser
          </Button>
        )}
      </div>

      {query.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookUser}
          title={hasFilters ? "Aucun résultat" : "Annuaire vide"}
          detail={
            hasFilters
              ? "Élargissez la recherche ou changez de pays."
              : "Importez un fichier de contacts, ou créez vos premiers prospects."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser
              </Button>
            ) : (
              <Button onClick={() => setEntryOpen(true)}>
                <Plus className="h-4 w-4" />
                Ajouter une entrée
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate">
            {total} entrée{total > 1 ? "s" : ""}
            {country && ` — ${country}`}
          </p>

          <motion.div
            variants={reduced ? undefined : staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {rows.map((entry) => (
              <motion.article
                key={`${entry.kind}-${entry.id}`}
                variants={reduced ? undefined : staggerItem}
                className="card-lift rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      entry.kind === "CONTACT"
                        ? "bg-signal/10 text-signal"
                        : "bg-amber/10 text-amber",
                    )}
                  >
                    {initials(entry.firstName, entry.lastName)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {entry.firstName} {entry.lastName}
                    </p>
                    {entry.jobTitle && (
                      <p className="truncate text-xs text-slate">{entry.jobTitle}</p>
                    )}
                  </div>

                  <Badge tone={entry.kind === "CONTACT" ? "signal" : "amber"}>
                    {entry.kind === "CONTACT" ? "Client" : "Prospect"}
                  </Badge>
                </div>

                <dl className="mt-3 space-y-1.5 text-sm">
                  {entry.company && (
                    <div className="flex items-center gap-2 text-slate">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{entry.company}</span>
                    </div>
                  )}

                  {entry.email && (
                    <a
                      href={`mailto:${entry.email}`}
                      className="flex items-center gap-2 text-slate hover:text-wire"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{entry.email}</span>
                    </a>
                  )}

                  {entry.phone && (
                    <a
                      href={`tel:${entry.phone}`}
                      className="flex items-center gap-2 text-slate hover:text-wire"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{entry.phone}</span>
                    </a>
                  )}

                  {(entry.country || entry.city) && (
                    <div className="flex items-center gap-2 text-slate">
                      <Globe2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {[entry.city, entry.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </dl>

                <div className="mt-3 flex items-center gap-2 border-t border-line pt-2">
                  {entry.assignedTo ? (
                    <p className="min-w-0 flex-1 truncate text-xs text-slate">
                      Suivi par {entry.assignedTo.firstName} {entry.assignedTo.lastName}
                    </p>
                  ) : (
                    <span className="flex-1" />
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-alert hover:bg-alert/10"
                    onClick={() => setToDelete(entry)}
                    aria-label={`Supprimer ${entry.firstName} ${entry.lastName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.article>
            ))}
          </motion.div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line pt-4">
              <p className="text-xs text-slate">
                Page {page} sur {totalPages}
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
        </>
      )}

      <DirectoryImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <DirectoryEntryModal open={entryOpen} onClose={() => setEntryOpen(false)} />

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer cette entrée ?"
        description={toDelete ? `${toDelete.firstName} ${toDelete.lastName}` : undefined}
      >
        <p className="text-sm leading-relaxed text-slate">
          {toDelete?.kind === "CONTACT"
            ? "Le contact disparaît de la fiche client et de l'annuaire. La fiche client, elle, reste intacte."
            : "Le prospect est supprimé définitivement. S'il est rattaché à une opportunité ou à un rendez-vous, la suppression sera refusée : clôturez-les d'abord."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)} disabled={remove.isPending}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={async () => {
              if (toDelete) await remove.mutateAsync(toDelete);
              setToDelete(null);
            }}
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

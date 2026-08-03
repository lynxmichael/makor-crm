import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  UserRoundX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/DataState";

import { UserFormModal } from "./UserFormModal";
import { usersService, rolesService } from "@/services/resources";
import { http } from "@/services/api";
import { useResourceList } from "@/hooks/use-resource";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { useAuthStore } from "@/store/auth.store";
import { QK, DEFAULT_PAGE_SIZE, roleLabel } from "@/config/constants";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatDate, initials } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

/**
 * Gestion des comptes agents (CDC §4.3, demande du 31/07/2026).
 *
 * Écran réservé au Super administrateur : le backend applique déjà
 * `@Roles('SUPER_ADMIN')` sur les écritures, l'interface évite simplement de
 * proposer des actions qui échoueraient.
 */
export function UsersPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<Row | null>(null);
  const [confirmReset2fa, setConfirmReset2fa] = useState<Row | null>(null);

  const debouncedSearch = useDebounced(search, 350);

  const params = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(role ? { role } : {}),
    }),
    [page, debouncedSearch, role],
  );

  const query = useResourceList<Row>(QK.users, usersService, params);

  const roles = useQuery({
    queryKey: QK.roles,
    queryFn: () => rolesService.all(),
  });

  const disable = useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      toast.success("Compte désactivé");
      queryClient.invalidateQueries({ queryKey: QK.users });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => usersService.update(id, { isActive: true }),
    onSuccess: () => {
      toast.success("Compte réactivé");
      queryClient.invalidateQueries({ queryKey: QK.users });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const resetTwoFactor = useMutation({
    mutationFn: (id: string) => http.patch(`/users/${id}/two-factor/reset`),
    onSuccess: () => {
      toast.success("Double authentification réinitialisée");
      queryClient.invalidateQueries({ queryKey: QK.users });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasFilters = Boolean(debouncedSearch || role);

  function openForm(user: Row | null) {
    setEditing(user);
    setFormOpen(true);
  }

  function resetFilters() {
    setSearch("");
    setRole("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Comptes et accès
          </h1>
          <p className="mt-1 text-sm text-slate">
            {query.isPending ? "Chargement…" : `${total} compte${total > 1 ? "s" : ""}`}
          </p>
        </div>

        <Button onClick={() => openForm(null)}>
          <Plus className="h-4 w-4" />
          Nouveau compte
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par nom ou e-mail"
            className="pl-9"
            aria-label="Rechercher un compte"
          />
        </div>

        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[180px]"
          aria-label="Filtrer par rôle"
        >
          <option value="">Tous les rôles</option>
          {((roles.data as Row[]) ?? []).map((entry) => (
            <option key={String(entry.id)} value={String(entry.name)}>
              {roleLabel(entry as { name?: string; label?: string })}
            </option>
          ))}
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <SlidersHorizontal className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {query.isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "Aucun résultat" : "Aucun compte"}
          detail={
            hasFilters
              ? "Élargissez la recherche ou retirez un filtre."
              : "Créez les comptes de vos commerciaux, superviseurs et administrateurs."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            ) : (
              <Button onClick={() => openForm(null)}>
                <Plus className="h-4 w-4" />
                Nouveau compte
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Fonction</th>
                  <th className="px-4 py-3">Double auth.</th>
                  <th className="px-4 py-3">Dernière connexion</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <motion.tbody
                key={page}
                variants={reduced ? undefined : staggerContainer}
                initial="initial"
                animate="animate"
              >
                {rows.map((user) => {
                  const id = String(user.id);
                  const isSelf = id === currentUserId;
                  const isActive = user.isActive !== false;
                  const has2fa = user.twoFactorEnabled === true;

                  return (
                    <motion.tr
                      key={id}
                      variants={reduced ? undefined : staggerItem}
                      className={`border-b border-line transition-colors last:border-0 hover:bg-paper/60 ${
                        isActive ? "" : "opacity-60"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wire/10 text-xs font-semibold text-wire">
                            {initials(String(user.firstName ?? ""), String(user.lastName ?? ""))}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {String(user.firstName ?? "")} {String(user.lastName ?? "")}
                              {isSelf && <span className="ml-1.5 text-xs text-slate">(vous)</span>}
                            </span>
                            <span className="block truncate text-xs text-slate">
                              {String(user.email ?? "")}
                            </span>
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Badge tone="neutral">
                          {roleLabel(user.role as { name?: string; label?: string })}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-slate">{String(user.jobTitle ?? "—")}</td>

                      <td className="px-4 py-3">
                        {has2fa ? (
                          <span className="flex items-center gap-1.5 text-xs text-signal">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-slate">
                            <ShieldOff className="h-3.5 w-3.5" />
                            Non configurée
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt as string) : "Jamais"}
                      </td>

                      <td className="px-4 py-3">
                        <Badge tone={isActive ? "signal" : "neutral"}>
                          {isActive ? "Actif" : "Désactivé"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openForm(user)}
                            aria-label={`Modifier ${String(user.firstName ?? "")}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {has2fa && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber hover:bg-amber/10"
                              onClick={() => setConfirmReset2fa(user)}
                              aria-label="Réinitialiser la double authentification"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}

                          {isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-alert hover:bg-alert/10"
                              // Le serveur refuse aussi l'auto-désactivation ;
                              // on n'offre pas le bouton pour autant.
                              disabled={isSelf}
                              onClick={() => setConfirmDisable(user)}
                              aria-label="Désactiver le compte"
                            >
                              <UserRoundX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-signal hover:bg-signal/10"
                              onClick={() => reactivate.mutate(id)}
                              disabled={reactivate.isPending}
                            >
                              Réactiver
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <p className="text-xs text-slate">
                Page {page} sur {totalPages} · {total} compte{total > 1 ? "s" : ""}
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

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editing}
        roles={(roles.data as Row[]) ?? []}
      />

      <Modal
        open={Boolean(confirmDisable)}
        onClose={() => setConfirmDisable(null)}
        title="Désactiver ce compte ?"
        description={`${String(confirmDisable?.firstName ?? "")} ${String(confirmDisable?.lastName ?? "")}`}
      >
        <p className="text-sm leading-relaxed text-slate">
          L'agent ne pourra plus se connecter. Son portefeuille, ses opportunités et ses écritures
          restent intacts et lui demeurent rattachés — c'est pourquoi un compte se désactive
          plutôt qu'il ne se supprime.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDisable(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={disable.isPending}
            onClick={async () => {
              if (confirmDisable) await disable.mutateAsync(String(confirmDisable.id));
              setConfirmDisable(null);
            }}
          >
            Désactiver
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmReset2fa)}
        onClose={() => setConfirmReset2fa(null)}
        title="Réinitialiser la double authentification ?"
        description={`${String(confirmReset2fa?.firstName ?? "")} ${String(confirmReset2fa?.lastName ?? "")}`}
      >
        <p className="text-sm leading-relaxed text-slate">
          Le secret et les codes de secours sont effacés. L'agent devra reconfigurer sa double
          authentification à sa prochaine connexion si son rôle l'impose. L'opération est
          journalisée à votre nom.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset2fa(null)}>
            Annuler
          </Button>
          <Button
            disabled={resetTwoFactor.isPending}
            onClick={() => {
              if (confirmReset2fa) resetTwoFactor.mutate(String(confirmReset2fa.id));
              setConfirmReset2fa(null);
            }}
          >
            <KeyRound className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </Modal>
    </div>
  );
}

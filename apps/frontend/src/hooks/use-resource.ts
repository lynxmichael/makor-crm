import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { ListParams, Resource } from "@/services/resources";
import { DEFAULT_PAGE_SIZE } from "@/config/constants";
import type { Paginated } from "@/types/api";

/**
 * Accès en lecture à une ressource paginée.
 *
 * `placeholderData` conserve la page précédente pendant le chargement de la
 * suivante : la table ne se vide pas à chaque changement de page, ce qui
 * évite le saut de mise en page le plus courant des interfaces de liste.
 */
export function useResourceList<T = Record<string, unknown>>(
  key: QueryKey,
  resource: Resource<T>,
  params: ListParams = {},
  /**
   * Options TanStack Query supplémentaires — `refetchInterval` notamment,
   * pour les listes qui bougent côté serveur (envois de campagne en cours).
   * `queryKey` et `queryFn` restent pilotés ici.
   */
  options?: Omit<
    UseQueryOptions<Paginated<T>, unknown, Paginated<T>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: [...key, params],
    queryFn: () => resource.list({ limit: DEFAULT_PAGE_SIZE, ...params }),
    placeholderData: (previous) => previous as Paginated<T> | undefined,
    ...options,
  });
}

export function useResourceItem<T = Record<string, unknown>>(
  key: QueryKey,
  resource: Resource<T>,
  id: string | undefined,
) {
  return useQuery({
    queryKey: [...key, id],
    queryFn: () => resource.get(id!),
    enabled: Boolean(id),
  });
}

/**
 * Écritures. Chaque succès invalide la racine de la ressource — plus simple
 * et plus sûr qu'une mise à jour manuelle du cache, pour un CRM où le serveur
 * calcule des champs dérivés (références, totaux, statuts).
 */
export function useResourceMutations<T = Record<string, unknown>>(
  key: QueryKey,
  resource: Resource<T>,
  labels: { created?: string; updated?: string; deleted?: string } = {},
) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => resource.create(body as never),
    onSuccess: () => {
      invalidate();
      toast.success(labels.created ?? "Élément créé");
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      resource.update(id, body as never),
    onSuccess: () => {
      invalidate();
      toast.success(labels.updated ?? "Modifications enregistrées");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => resource.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success(labels.deleted ?? "Élément supprimé");
    },
  });

  return { create, update, remove, isBusy: create.isPending || update.isPending || remove.isPending };
}

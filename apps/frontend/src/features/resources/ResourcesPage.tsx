import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  PlayCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { ResourceFormModal } from "./ResourceFormModal";
import { resourcesLibraryService } from "@/services/resources-library";
import { useAuthStore } from "@/store/auth.store";
import { useDebounced } from "@/hooks/use-debounced";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { openFile } from "@/services/api";
import type { ApiError } from "@/types/api";
import {
  RESOURCE_CATEGORY_LABELS,
  RESOURCE_TYPE_LABELS,
  type Resource,
  type ResourceCategory,
  type ResourceType,
} from "@/types/resource";

const TYPE_ICONS = {
  DOCUMENT: FileText,
  VIDEO: PlayCircle,
  LIEN: Link2,
  ARTICLE: BookOpen,
} as const;

export function ResourcesPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();
  const isSuperAdmin = useAuthStore((s) => s.user?.role?.name === "SUPER_ADMIN");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ResourceCategory | "">("");
  const [type, setType] = useState<ResourceType | "">("");
  const [editing, setEditing] = useState<Resource | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const debouncedSearch = useDebounced(search, 350);

  const params = useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(category ? { category } : {}),
      ...(type ? { type } : {}),
    }),
    [debouncedSearch, category, type],
  );

  const query = useQuery({
    queryKey: ["resources", params],
    queryFn: () => resourcesLibraryService.list(params),
  });

  const remove = useMutation({
    mutationFn: (id: string) => resourcesLibraryService.remove(id),
    onSuccess: () => {
      toast.success("Ressource supprimée");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  /**
   * La consultation est comptée à l'ouverture réelle, pas au rendu de la
   * carte : sinon le compteur mesurerait le passage sur la page, pas
   * l'intérêt porté à la ressource.
   */
  function open(resource: Resource) {
    void resourcesLibraryService.registerView(resource.id).catch(() => undefined);

    if (resource.type === "DOCUMENT" && resource.filePath) {
      void openFile(resource.filePath, resource.fileName ?? undefined);
      return;
    }

    if (resource.url) window.open(resource.url, "_blank", "noopener");
  }

  function openForm(resource: Resource | null) {
    setEditing(resource);
    setFormOpen(true);
  }

  const groups = query.data?.groups ?? [];
  const hasFilters = Boolean(debouncedSearch || category || type);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Ressources</h1>
          <p className="mt-1 text-sm text-slate">
            Formation et documentation sur les différents modules du CRM.
          </p>
        </div>

        {isSuperAdmin && (
          <Button onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" />
            Ajouter une ressource
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans les ressources"
            className="pl-9"
            aria-label="Rechercher une ressource"
          />
        </div>

        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as ResourceCategory | "")}
          className="w-auto min-w-[180px]"
          aria-label="Filtrer par module"
        >
          <option value="">Tous les modules</option>
          {Object.entries(RESOURCE_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          value={type}
          onChange={(e) => setType(e.target.value as ResourceType | "")}
          className="w-auto min-w-[140px]"
          aria-label="Filtrer par type"
        >
          <option value="">Tous les types</option>
          {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={hasFilters ? "Aucune ressource ne correspond" : "La bibliothèque est vide"}
          detail={
            hasFilters
              ? "Élargissez la recherche ou retirez un filtre."
              : isSuperAdmin
                ? "Ajoutez un premier guide ou une vidéo pour aider vos équipes à prendre en main le CRM."
                : "Aucune documentation n'a encore été publiée. Revenez plus tard."
          }
          action={
            isSuperAdmin && !hasFilters ? (
              <Button onClick={() => openForm(null)}>
                <Plus className="h-4 w-4" />
                Ajouter une ressource
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map(({ category: groupCategory, items }) => (
            <section key={groupCategory}>
              <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate">
                {RESOURCE_CATEGORY_LABELS[groupCategory]}
              </h2>

              <motion.div
                variants={reduced ? undefined : staggerContainer}
                initial="initial"
                animate="animate"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {items.map((resource) => {
                  const Icon = TYPE_ICONS[resource.type];

                  return (
                    <motion.article
                      key={resource.id}
                      variants={reduced ? undefined : staggerItem}
                      className="card-lift flex flex-col rounded-xl border border-line bg-surface p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wire/10 text-wire">
                          <Icon className="h-4 w-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-sm font-semibold text-ink">
                            {resource.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate">
                            {RESOURCE_TYPE_LABELS[resource.type]}
                            {resource.viewCount > 0 &&
                              ` · ${resource.viewCount} consultation${resource.viewCount > 1 ? "s" : ""}`}
                          </p>
                        </div>

                        {!resource.isPublished && <Badge tone="neutral">Brouillon</Badge>}
                      </div>

                      {resource.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate">
                          {resource.description}
                        </p>
                      )}

                      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                        {resource.type === "ARTICLE" ? (
                          <Button size="sm" variant="secondary" onClick={() => openForm(resource)}>
                            <BookOpen className="h-3.5 w-3.5" />
                            Lire
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => open(resource)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ouvrir
                          </Button>
                        )}

                        {isSuperAdmin && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openForm(resource)}>
                              Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-auto text-alert hover:bg-alert/10"
                              onClick={() => remove.mutate(resource.id)}
                              disabled={remove.isPending}
                              aria-label={`Supprimer ${resource.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            </section>
          ))}
        </div>
      )}

      <ResourceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        resource={editing}
        readOnly={!isSuperAdmin}
      />
    </div>
  );
}

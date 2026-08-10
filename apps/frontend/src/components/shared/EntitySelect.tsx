import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebounced } from "@/hooks/use-debounced";
import type { Paginated } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

interface Props {
  /** Service produit par `createResource` : on n'utilise que `list`. */
  service: { list: (params?: Record<string, unknown>) => Promise<Paginated<Row>> };
  queryKey: readonly string[];
  value?: string;
  onChange: (id: string, row: Row | null) => void;
  /** Comment afficher une ligne dans la liste et une fois sélectionnée. */
  render: (row: Row) => { label: string; detail?: string };
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Sélecteur recherchable sur une ressource paginée.
 *
 * Remplace les champs où l'utilisateur devait saisir un identifiant à la
 * main : personne ne connaît par cœur un cuid, et une faute de frappe se
 * traduisait par un 400 incompréhensible. La recherche part au serveur, donc
 * le composant reste utilisable avec un catalogue de plusieurs milliers de
 * lignes.
 */
export function EntitySelect({
  service,
  queryKey,
  value,
  onChange,
  render,
  placeholder = "Rechercher…",
  disabled,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounced(search, 300);

  const query = useQuery({
    queryKey: [...queryKey, "select", debouncedSearch],
    queryFn: () => service.list({ limit: 20, ...(debouncedSearch ? { search: debouncedSearch } : {}) }),
    enabled: open,
  });

  // Recharge le libellé quand la valeur vient d'ailleurs (édition d'une facture proforma
  // existant) : sans cela, le champ afficherait un identifiant brut.
  const detailQuery = useQuery({
    queryKey: [...queryKey, "select-resolve", value],
    queryFn: () => service.list({ limit: 1, id: value }),
    enabled: Boolean(value) && !selected,
  });

  useEffect(() => {
    const resolved = detailQuery.data?.data?.[0];
    if (resolved && !selected) setSelected(resolved);
  }, [detailQuery.data, selected]);

  // Fermer au clic extérieur : une liste ouverte qui reste ouverte pendant
  // qu'on saisit ailleurs masque le reste du formulaire.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const rows = query.data?.data ?? [];
  const display = selected ? render(selected) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-[11px] border border-line bg-surface px-3 text-left text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className={cn("truncate", display ? "text-ink" : "text-slate")}>
          {display ? display.label : placeholder}
        </span>

        <span className="flex shrink-0 items-center gap-1">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Effacer la sélection"
              onClick={(event) => {
                event.stopPropagation();
                setSelected(null);
                onChange("", null);
              }}
              className="rounded p-0.5 text-slate hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-slate" />
        </span>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-e2">
          <div className="relative border-b border-line p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="h-9 pl-8"
              autoFocus
            />
          </div>

          <div className="scrollbar-thin max-h-56 overflow-y-auto">
            {query.isPending ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-slate">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </p>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate">Aucun résultat.</p>
            ) : (
              <ul>
                {rows.map((row) => {
                  const item = render(row);
                  const isSelected = String(row.id) === value;

                  return (
                    <li key={String(row.id)}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(row);
                          onChange(String(row.id), row);
                          setOpen(false);
                          setSearch("");
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper",
                          isSelected && "bg-wire/5",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{item.label}</span>
                          {item.detail && (
                            <span className="block truncate text-xs text-slate">{item.detail}</span>
                          )}
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-wire" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

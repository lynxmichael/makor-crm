import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Globe2, Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";

import { http } from "@/services/api";
import { useDebounced } from "@/hooks/use-debounced";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/types/api";

interface Entry {
  id: string;
  kind: "CONTACT" | "LEAD";
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
}

/**
 * Chargement des destinataires depuis l'annuaire (demande du 07/08/2026).
 *
 * Le canal détermine la coordonnée retenue : un SMS part vers un numéro, un
 * e-mail vers une adresse. Les entrées dépourvues de la bonne coordonnée sont
 * écartées d'office — les proposer produirait des échecs d'envoi facturés.
 */
export function RecipientPickerModal({
  open,
  onClose,
  channel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  /** SMS, WHATSAPP et VOICE visent le téléphone ; EMAIL vise l'adresse. */
  channel: string;
  onConfirm: (values: string[]) => void;
}) {
  const wantsEmail = channel === "EMAIL";

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [kind, setKind] = useState<"" | "CONTACT" | "LEAD">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounced(search, 350);

  const query = useQuery({
    queryKey: ["directory", "picker", debouncedSearch, country, kind],
    queryFn: () =>
      http.get<Paginated<Entry>>("/directory", {
        params: {
          limit: 200,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(country ? { country } : {}),
          ...(kind ? { kind } : {}),
        },
      }),
    enabled: open,
  });

  const countries = useQuery({
    queryKey: ["directory", "countries"],
    queryFn: () => http.get<{ country: string; count: number }[]>("/directory/countries"),
    enabled: open,
  });

  const valueOf = (entry: Entry) => (wantsEmail ? entry.email : entry.phone);

  // On n'affiche que ce qui est joignable sur le canal choisi.
  const reachable = useMemo(
    () => (query.data?.data ?? []).filter((entry) => Boolean(valueOf(entry))),
    [query.data, wantsEmail],
  );

  const excluded = (query.data?.data ?? []).length - reachable.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    const values = reachable
      .filter((entry) => selected.has(entry.id))
      .map((entry) => valueOf(entry)!)
      // Un même numéro peut figurer sur un contact et un prospect : envoyer
      // deux fois le même message serait facturé deux fois.
      .filter((value, index, all) => all.indexOf(value) === index);

    if (values.length === 0) {
      toast.error("Aucun destinataire sélectionné.");
      return;
    }

    onConfirm(values);
    setSelected(new Set());
    onClose();
  }

  const allSelected = reachable.length > 0 && reachable.every((e) => selected.has(e.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Charger depuis l'annuaire"
      description={
        wantsEmail
          ? "Seules les entrées disposant d'une adresse e-mail sont proposées."
          : "Seules les entrées disposant d'un numéro de téléphone sont proposées."
      }
      className="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un nom ou une entreprise"
              className="pl-9"
              aria-label="Rechercher dans l'annuaire"
            />
          </div>

          <Select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-auto min-w-[150px]"
            aria-label="Filtrer par pays"
          >
            <option value="">Tous les pays</option>
            {(countries.data ?? []).map((entry) => (
              <option key={entry.country} value={entry.country}>
                {entry.country} ({entry.count})
              </option>
            ))}
          </Select>

          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as "" | "CONTACT" | "LEAD")}
            className="w-auto min-w-[150px]"
            aria-label="Filtrer par type"
          >
            <option value="">Contacts et prospects</option>
            <option value="CONTACT">Contacts clients</option>
            <option value="LEAD">Prospects</option>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setSelected(allSelected ? new Set() : new Set(reachable.map((e) => e.id)))
            }
            disabled={reachable.length === 0}
          >
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </Button>

          <span className="flex items-center gap-1.5 text-slate">
            <Users className="h-3.5 w-3.5" />
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""} sur {reachable.length}
          </span>

          {excluded > 0 && (
            <span className="text-xs text-amber">
              {excluded} entrée{excluded > 1 ? "s" : ""} écartée{excluded > 1 ? "s" : ""} — pas
              de {wantsEmail ? "adresse e-mail" : "numéro"}
            </span>
          )}
        </div>

        {query.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : reachable.length === 0 ? (
          <p className="rounded-xl bg-paper px-4 py-10 text-center text-sm text-slate">
            Aucune entrée joignable sur ce canal. Élargissez la recherche, ou complétez les
            coordonnées depuis l'annuaire.
          </p>
        ) : (
          <ul className="scrollbar-thin max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {reachable.map((entry) => {
              const checked = selected.has(entry.id);

              return (
                <li key={entry.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors",
                      checked ? "bg-wire/5" : "hover:bg-paper/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(entry.id)}
                      className="h-4 w-4 shrink-0 rounded border-line accent-wire"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {entry.firstName} {entry.lastName}
                        {entry.company && (
                          <span className="text-slate"> · {entry.company}</span>
                        )}
                      </span>
                      <span className="block truncate font-mono-tabular text-xs text-slate">
                        {valueOf(entry)}
                      </span>
                    </span>

                    {entry.country && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-slate">
                        <Globe2 className="h-3 w-3" />
                        {entry.country}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={confirm} disabled={selected.size === 0 || query.isPending}>
            {query.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Ajouter {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

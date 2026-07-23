import { useMemo, useState } from "react";
import { Search, X, Mail, Phone, MapPin, Plus, Pencil, Archive, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EntityFormModal, type FieldDef } from "@/components/shared/EntityFormModal";
import { mockClients, mockOpportunities, sectors, countries } from "@/data/mock";
import { formatCFA, initials } from "@/lib/utils";
import type { Client, ModuleRow } from "@/types";

const clientFields: FieldDef[] = [
  { key: "name", label: "Nom de l'entreprise", placeholder: "Ex. Ecobank CI" },
  { key: "sector", label: "Secteur d'activité", type: "select", options: sectors },
  { key: "country", label: "Pays", type: "select", options: countries },
  { key: "contact", label: "Contact principal", placeholder: "Ex. Awa Diabaté" },
  { key: "email", label: "E-mail", placeholder: "Ex. contact@entreprise.com" },
  { key: "phone", label: "Téléphone", placeholder: "Ex. +225 07 01 22 33 44" },
];

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    );
  }, [query, clients]);

  const clientOpportunities = selected ? mockOpportunities.filter((o) => o.clientName === selected.name) : [];

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setModalOpen(true);
  }

  function handleSubmit(values: ModuleRow) {
    if (editing) {
      const updated: Client = { ...editing, ...(values as unknown as Partial<Client>) };
      setClients((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      if (selected?.id === editing.id) setSelected(updated);
    } else {
      const created: Client = {
        id: `c${Date.now()}`,
        name: String(values.name ?? ""),
        sector: String(values.sector ?? ""),
        country: String(values.country ?? ""),
        contact: String(values.contact ?? ""),
        email: String(values.email ?? ""),
        phone: String(values.phone ?? ""),
        status: "actif",
        volumeYtd: 0,
        marginYtd: 0,
      };
      setClients((prev) => [created, ...prev]);
    }
  }

  function toggleArchive(client: Client) {
    const updated: Client = { ...client, status: client.status === "actif" ? "archive" : "actif" };
    setClients((prev) => prev.map((c) => (c.id === client.id ? updated : c)));
    setSelected(updated);
  }

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Clients</h1>
            <p className="mt-1 text-sm text-slate">{filtered.length} entreprises</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
              <Input
                placeholder="Nom, secteur, pays…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau client
            </Button>
          </div>
        </div>

        <Table>
          <Thead>
            <Tr>
              <Th>Entreprise</Th>
              <Th>Secteur</Th>
              <Th>Pays</Th>
              <Th>Contact</Th>
              <Th className="text-right">Volume YTD</Th>
              <Th>Statut</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((client) => (
              <Tr key={client.id} className="cursor-pointer" onClick={() => setSelected(client)}>
                <Td className="font-medium">{client.name}</Td>
                <Td className="text-slate">{client.sector}</Td>
                <Td className="text-slate">{client.country}</Td>
                <Td className="text-slate">{client.contact}</Td>
                <Td className="text-right font-mono-tabular">{client.volumeYtd.toLocaleString("fr-FR")}</Td>
                <Td>
                  <Badge tone={client.status === "actif" ? "signal" : "neutral"}>
                    {client.status === "actif" ? "Actif" : "Archivé"}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      {selected && (
        <Card className="h-fit w-80 shrink-0 p-0">
          <div className="flex items-start justify-between border-b border-line p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-wire/10 font-display text-sm font-semibold text-wire">
                {initials(selected.name)}
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-ink">{selected.name}</p>
                <p className="text-xs text-slate">{selected.sector}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-full p-1 text-slate hover:bg-paper hover:text-ink"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate">
                <MapPin className="h-3.5 w-3.5" /> {selected.country}
              </div>
              <div className="flex items-center gap-2 text-slate">
                <Mail className="h-3.5 w-3.5" /> {selected.email}
              </div>
              <div className="flex items-center gap-2 text-slate">
                <Phone className="h-3.5 w-3.5" /> {selected.phone}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate">Volume YTD</p>
                <p className="font-mono-tabular text-sm font-semibold text-ink">
                  {selected.volumeYtd.toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate">Marge YTD</p>
                <p className="font-mono-tabular text-sm font-semibold text-ink">{formatCFA(selected.marginYtd)}</p>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-slate">Opportunités liées</p>
              {clientOpportunities.length === 0 ? (
                <p className="text-xs text-slate">Aucune opportunité en cours.</p>
              ) : (
                <div className="space-y-2">
                  {clientOpportunities.map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-xs">
                      <span className="text-ink">{o.product}</span>
                      <span className="font-mono-tabular text-slate">{formatCFA(o.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-line pt-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(selected)}>
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => toggleArchive(selected)}>
                {selected.status === "actif" ? (
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
            </div>
          </div>
        </Card>
      )}

      <EntityFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editing ? `Modifier — ${editing.name}` : "Nouveau client"}
        fields={clientFields}
        initialValues={editing as unknown as ModuleRow | undefined}
      />
    </div>
  );
}

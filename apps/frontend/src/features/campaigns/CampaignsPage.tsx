import { useState } from "react";
import { Radio, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SignalMeter } from "@/components/ui/SignalMeter";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EntityFormModal, type FieldDef } from "@/components/shared/EntityFormModal";
import { mockCampaigns, mockClients, countries } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import type { Campaign, ModuleRow } from "@/types";

const products = ["SMS Marketing", "OTP", "API SMS", "WhatsApp", "Voice", "Sender ID"];
const clientNames = mockClients.map((c) => c.name);

const campaignFields: FieldDef[] = [
  { key: "name", label: "Nom de la campagne", placeholder: "Ex. Relance impayés — Août" },
  { key: "client", label: "Client", type: "select", options: clientNames },
  { key: "product", label: "Produit", type: "select", options: products },
  { key: "country", label: "Pays", type: "select", options: countries },
  { key: "sentAt", label: "Date d'envoi", type: "date" },
  { key: "volume", label: "Volume estimé", type: "number", placeholder: "Ex. 50000" },
];

const statusLabel: Record<string, string> = {
  programmee: "Programmée",
  en_cours: "En cours",
  terminee: "Terminée",
  anomalie: "Anomalie",
};

const statusTone: Record<string, "neutral" | "wire" | "signal" | "alert"> = {
  programmee: "neutral",
  en_cours: "wire",
  terminee: "signal",
  anomalie: "alert",
};

function deliveryLevel(rate: number): 1 | 2 | 3 | 4 {
  if (rate === 0) return 1;
  if (rate < 85) return 2;
  if (rate < 95) return 3;
  return 4;
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [modalOpen, setModalOpen] = useState(false);

  const anomalies = campaigns.filter((c) => c.status === "anomalie");

  function handleCreate(values: ModuleRow) {
    const created: Campaign = {
      id: `cp${Date.now()}`,
      name: String(values.name ?? ""),
      client: String(values.client ?? ""),
      product: String(values.product ?? "SMS Marketing") as Campaign["product"],
      country: String(values.country ?? ""),
      sentAt: String(values.sentAt ?? new Date().toISOString().slice(0, 10)),
      volume: Number(values.volume ?? 0),
      deliveryRate: 0,
      status: "programmee",
    };
    setCampaigns((prev) => [created, ...prev]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Campagnes</h1>
          <p className="mt-1 text-sm text-slate">Création, programmation et suivi de l'envoi technique</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Radio className="h-4 w-4" />
          Nouvelle campagne
        </Button>
      </div>

      {anomalies.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-alert/20 bg-alert/5 px-4 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
          <p className="text-sm text-ink">
            <span className="font-medium">{anomalies.length} campagne(s) en anomalie</span> — taux de
            délivrabilité anormalement bas détecté sur « {anomalies[0].name} ». Vérifier le statut opérateur
            côté passerelle.
          </p>
        </div>
      )}

      <Table>
        <Thead>
          <Tr>
            <Th>Campagne</Th>
            <Th>Client</Th>
            <Th>Produit</Th>
            <Th>Pays</Th>
            <Th>Envoi</Th>
            <Th className="text-right">Volume</Th>
            <Th>Délivrabilité</Th>
            <Th>Statut</Th>
          </Tr>
        </Thead>
        <Tbody>
          {campaigns.map((c) => (
            <Tr key={c.id}>
              <Td className="font-medium">{c.name}</Td>
              <Td className="text-slate">{c.client}</Td>
              <Td>
                <Badge tone="wire">{c.product}</Badge>
              </Td>
              <Td className="text-slate">{c.country}</Td>
              <Td className="text-slate">{formatDate(c.sentAt)}</Td>
              <Td className="text-right font-mono-tabular">{c.volume.toLocaleString("fr-FR")}</Td>
              <Td>
                <SignalMeter
                  level={deliveryLevel(c.deliveryRate)}
                  tone={c.status === "anomalie" ? "alert" : "signal"}
                  label={c.status === "programmee" ? "—" : `${c.deliveryRate.toFixed(1)} %`}
                />
              </Td>
              <Td>
                <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <EntityFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        title="Nouvelle campagne"
        description="Elle est créée au statut Programmée, en attente d'envoi par la passerelle."
        fields={campaignFields}
      />
    </div>
  );
}

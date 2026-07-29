import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { exportRowsAsCsv } from "@/lib/utils";
import {
  julySummary,
  topClientsParVolume,
  topClientsParMarge,
  volumeParPays,
  margeParPays,
  rechargements,
  rejetsSmsDetail,
  soldesPrepayes,
  syntheseRecommandations,
  type ClientMetric,
  type CountryMetric,
} from "@/data/reporting-juillet-2026";

const observationTone: Record<CountryMetric["observation"], "signal" | "amber" | "alert" | "neutral"> = {
  Stable: "neutral",
  Progression: "signal",
  "Forte progression": "signal",
  Régression: "alert",
};

function fmtFcfa(n: number) {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} FCFA`;
}

function fmtNum(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function StatTile({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
        <p className="font-mono-tabular text-2xl font-semibold text-ink">{value}</p>
        {caption && <p className="text-xs text-slate">{caption}</p>}
      </CardContent>
    </Card>
  );
}

function TopList({
  title,
  data,
  format,
  color,
}: {
  title: string;
  data: ClientMetric[];
  format: (n: number) => string;
  color: string;
}) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {data.map((d, i) => (
          <div key={d.client} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink">
                <span className="mr-1.5 text-slate">{i + 1}.</span>
                {d.client}
              </span>
              <span className="shrink-0 font-mono-tabular text-xs text-slate">{format(d.value)}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-line/70">
              <div
                className="h-1.5 rounded-full transition-[width]"
                style={{ width: `${max > 0 ? (d.value / max) * 100 : 0}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CountryTable({ title, data, format }: { title: string; data: CountryMetric[]; format: (n: number) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <Table>
          <Thead>
            <Tr>
              <Th>Pays</Th>
              <Th className="text-right">Semaine 1</Th>
              <Th className="text-right">Semaine 2</Th>
              <Th className="text-right">À ce jour</Th>
              <Th>Évolution S2/S1</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.map((row) => (
              <Tr key={row.country}>
                <Td className="font-medium">{row.country}</Td>
                <Td className="text-right font-mono-tabular">{format(row.week1)}</Td>
                <Td className="text-right font-mono-tabular">{format(row.week2)}</Td>
                <Td className="text-right font-mono-tabular font-semibold">{format(row.total)}</Td>
                <Td>
                  <Badge tone={observationTone[row.observation]}>{row.observation}</Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  function handleExport() {
    exportRowsAsCsv(
      "reporting-juillet-2026-top-clients.csv",
      [
        { key: "client", label: "Client" },
        { key: "volume", label: "Volume SMS" },
        { key: "marge", label: "Marge FCFA" },
      ],
      topClientsParVolume.map((v) => ({
        client: v.client,
        volume: v.value,
        marge: topClientsParMarge.find((m) => m.client === v.client)?.value ?? "",
      }))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Rapports</h1>
          <p className="mt-1 text-sm text-slate">
            Reporting {julySummary.period} — synthèse de la consommation, de la marge et du suivi commercial
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exporter (CSV)
        </Button>
      </div>

      <motion.div
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      >
        {[
          { label: "Volume SMS", value: fmtNum(julySummary.volumeSms) },
          { label: "Marge totale", value: fmtFcfa(julySummary.margeTotale) },
          { label: "Clients actifs", value: String(julySummary.clientsActifs) },
          { label: "Marge / SMS", value: `${julySummary.margeParSms.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA` },
          { label: "Réchargements", value: fmtFcfa(julySummary.rechargements) },
          { label: "Rejets SMS", value: fmtNum(julySummary.rejetsSms) },
        ].map((tile) => (
          <motion.div key={tile.label} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <StatTile label={tile.label} value={tile.value} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopList title="Top 10 clients par volume" data={topClientsParVolume} format={(n) => `${fmtNum(n)} SMS`} color="#0e7c86" />
        <TopList title="Top 10 clients par marge" data={topClientsParMarge} format={fmtFcfa} color="#e8a23d" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CountryTable title="Volume par pays (SMS)" data={volumeParPays} format={fmtNum} />
        <CountryTable title="Marge par pays" data={margeParPays} format={fmtFcfa} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Réchargements récents</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Table>
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Client</Th>
                  <Th>Produit</Th>
                  <Th className="text-right">Montant</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rechargements.map((r, i) => (
                  <Tr key={i}>
                    <Td>{r.date}</Td>
                    <Td className="font-medium">{r.client}</Td>
                    <Td>{r.produit}</Td>
                    <Td className="text-right font-mono-tabular">{fmtFcfa(r.montant)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rejets SMS</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Table>
              <Thead>
                <Tr>
                  <Th>Période</Th>
                  <Th>Client</Th>
                  <Th className="text-right">Rejets</Th>
                  <Th className="text-right">Code erreur</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rejetsSmsDetail.map((r, i) => (
                  <Tr key={i}>
                    <Td>{r.date}</Td>
                    <Td className="font-medium">{r.client}</Td>
                    <Td className="text-right font-mono-tabular text-alert">{fmtNum(r.rejets)}</Td>
                    <Td className="text-right font-mono-tabular">{r.codeErreur}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Soldes clients prépayés</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Table>
            <Thead>
              <Tr>
                <Th>Client</Th>
                <Th className="text-right">Solde</Th>
              </Tr>
            </Thead>
            <Tbody>
              {soldesPrepayes.map((s) => (
                <Tr key={s.client}>
                  <Td className="font-medium">{s.client}</Td>
                  <Td className="text-right">
                    {s.solde === "Postpayé" ? (
                      <Badge tone="wire">Postpayé</Badge>
                    ) : (
                      <span className="font-mono-tabular">{fmtFcfa(s.solde)}</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Synthèse & recommandations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {syntheseRecommandations.map((s) => (
            <div key={s.titre}>
              <p className="text-sm font-semibold text-ink">{s.titre}</p>
              <p className="mt-0.5 text-sm text-slate">{s.texte}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SignalMeter } from "@/components/ui/SignalMeter";
import { KpiCard } from "@/components/shared/KpiCard";
import { kpis, mockCampaigns, mockOpportunities, pipelineStageLabels } from "@/data/mock";
import { formatCFA } from "@/lib/utils";
import type { Opportunity } from "@/types";

const volumeTrend = [
  { day: "01/07", volume: 92 },
  { day: "04/07", volume: 108 },
  { day: "07/07", volume: 101 },
  { day: "10/07", volume: 126 },
  { day: "13/07", volume: 118 },
  { day: "16/07", volume: 142 },
  { day: "18/07", volume: 137 },
];

const campaignStatusTone: Record<string, "signal" | "amber" | "alert" | "neutral" | "wire"> = {
  terminee: "signal",
  en_cours: "wire",
  programmee: "neutral",
  anomalie: "alert",
};

const campaignStatusLabel: Record<string, string> = {
  terminee: "Terminée",
  en_cours: "En cours",
  programmee: "Programmée",
  anomalie: "Anomalie",
};

function stageCount(stage: Opportunity["stage"]) {
  return mockOpportunities.filter((o) => o.stage === stage).length;
}

export function DashboardPage() {
  const totalPipelineValue = mockOpportunities
    .filter((o) => o.stage !== "vente")
    .reduce((sum, o) => sum + o.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate">Vue consolidée — tous pays, tous produits · 18 juillet 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Volume messages — 18 derniers jours</CardTitle>
            <span className="font-mono-tabular text-xs text-slate">en milliers</span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeTrend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0e7c86" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0e7c86" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e3e5e1" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5b6472" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#5b6472" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, borderColor: "#e3e5e1", fontSize: 12 }}
                    formatter={(value: number) => [`${value}k`, "Volume"]}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#0e7c86" strokeWidth={2} fill="url(#volumeFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline — vue rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <p className="font-mono-tabular text-2xl font-semibold text-ink">{formatCFA(totalPipelineValue)}</p>
            <p className="text-xs text-slate">Valeur des opportunités en cours</p>
            <div className="mt-3 space-y-2.5">
              {(Object.keys(pipelineStageLabels) as Opportunity["stage"][]).map((stage) => (
                <div key={stage} className="flex items-center justify-between text-sm">
                  <span className="text-slate">{pipelineStageLabels[stage]}</span>
                  <span className="font-mono-tabular font-medium text-ink">{stageCount(stage)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campagnes récentes</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="divide-y divide-line">
            {mockCampaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-slate">
                    {c.client} · {c.product} · {c.country}
                  </p>
                </div>
                <SignalMeter
                  level={(Math.max(1, Math.round(c.deliveryRate / 25)) as 1 | 2 | 3 | 4)}
                  tone={c.status === "anomalie" ? "alert" : "signal"}
                  label={c.status === "programmee" ? "—" : `${c.deliveryRate.toFixed(1)} %`}
                />
                <Badge tone={campaignStatusTone[c.status]}>{campaignStatusLabel[c.status]}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

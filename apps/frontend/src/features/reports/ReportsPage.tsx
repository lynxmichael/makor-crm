import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Receipt,
  Target,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/Field";

import { api } from "@/services/api";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import type { ApiError } from "@/types/api";

type Format = "xlsx" | "csv" | "pdf";

interface ReportDef {
  key: string;
  path: string;
  title: string;
  detail: string;
  icon: typeof Building2;
  /** Filtres acceptés par cette route — envoyer autre chose ferait un 400. */
  filters: ("period" | "country" | "sector")[];
}

/**
 * Centre d'export (CDC §4.15).
 *
 * Les endpoints `/reporting/*` ne renvoient pas de JSON mais un fichier —
 * Excel, CSV ou PDF selon le paramètre `format`. Cet écran n'affiche donc
 * pas de tableaux : il compose les filtres et déclenche le téléchargement.
 *
 * Le fichier passe par l'instance axios plutôt que par un lien direct :
 * la route exige un jeton porté par un en-tête, qu'une navigation classique
 * n'emporterait pas.
 */
const REPORTS: ReportDef[] = [
  {
    key: "customers",
    path: "/reporting/customers",
    title: "Portefeuille clients",
    detail: "Liste complète avec secteur, pays, coordonnées et solde de compte.",
    icon: Building2,
    filters: ["country", "sector"],
  },
  {
    key: "deals",
    path: "/reporting/deals",
    title: "Pipeline commercial",
    detail: "Opportunités par étape, montant, probabilité et commercial en charge.",
    icon: Target,
    filters: ["period"],
  },
  {
    key: "invoices",
    path: "/reporting/invoices",
    title: "Facturation",
    detail: "Factures émises, montants réglés et restant dus par client.",
    icon: Receipt,
    filters: ["period"],
  },
  {
    key: "recharges",
    path: "/reporting/recharges",
    title: "Recharges",
    detail: "Crédits de messagerie achetés par les clients sur la période.",
    icon: Wallet,
    filters: ["period"],
  },
  {
    key: "sales-performance",
    path: "/reporting/sales-performance",
    title: "Performance commerciale",
    detail: "Par commercial : affaires traitées, gagnées, taux de conversion et CA signé.",
    icon: BarChart3,
    filters: ["period"],
  },
];

const FORMAT_ICONS: Record<Format, typeof FileText> = {
  xlsx: FileSpreadsheet,
  csv: FileText,
  pdf: FileText,
};

export function ReportsPage() {
  const reduced = usePrefersReducedMotion();

  const [format, setFormat] = useState<Format>("xlsx");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(report: ReportDef) {
    setDownloading(report.key);

    try {
      // On ne transmet que les filtres que la route accepte : le backend
      // tourne en liste blanche, un paramètre en trop est rejeté.
      const params: Record<string, string> = { format };

      if (report.filters.includes("period")) {
        if (from) params.from = from;
        if (to) params.to = to;
      }
      if (report.filters.includes("country") && country) params.country = country;
      if (report.filters.includes("sector") && sector) params.sector = sector;

      const response = await api.get(report.path, { params, responseType: "blob" });

      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.key}-${new Date().toISOString().slice(0, 10)}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      toast.success("Export téléchargé");
    } catch (error) {
      toast.error((error as ApiError).message ?? "L'export a échoué.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Rapports</h1>
        <p className="mt-1 text-sm text-slate">
          Exports consolidés au format Excel, CSV ou PDF, filtrables par période et par zone.
        </p>
      </header>

      {/* Filtres communs */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Format" htmlFor="r-format">
            <Select
              id="r-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="pdf">PDF (.pdf)</option>
            </Select>
          </Field>

          <Field label="Du" htmlFor="r-from">
            <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>

          <Field label="Au" htmlFor="r-to">
            <Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>

          <Field label="Pays" htmlFor="r-country" hint="Portefeuille clients uniquement.">
            <Input
              id="r-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Côte d'Ivoire"
            />
          </Field>

          <Field label="Secteur" htmlFor="r-sector" hint="Portefeuille clients uniquement.">
            <Input
              id="r-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Télécommunications"
            />
          </Field>
        </div>

        <p className="mt-3 text-xs text-slate">
          Les filtres non applicables à un rapport sont ignorés — chaque export ne reçoit que
          les critères qu'il sait traiter.
        </p>
      </div>

      {/* Rapports disponibles */}
      <motion.div
        variants={reduced ? undefined : staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const FormatIcon = FORMAT_ICONS[format];
          const busy = downloading === report.key;

          return (
            <motion.article
              key={report.key}
              variants={reduced ? undefined : staggerItem}
              className="card-lift flex flex-col rounded-xl border border-line bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wire/10 text-wire">
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-sm font-semibold text-ink">{report.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate">{report.detail}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="flex items-center gap-1.5 text-xs text-slate">
                  <FormatIcon className="h-3.5 w-3.5" />
                  {format.toUpperCase()}
                </span>

                <Button size="sm" onClick={() => void download(report)} disabled={busy}>
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Exporter
                </Button>
              </div>
            </motion.article>
          );
        })}
      </motion.div>
    </div>
  );
}

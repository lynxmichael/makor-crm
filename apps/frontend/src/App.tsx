import { Route, Routes } from "react-router-dom";

import { LoginPage } from "@/features/auth/LoginPage";
import { CampaignsPage } from "@/features/campaigns/CampaignsPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PipelinePage } from "@/features/opportunities/PipelinePage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import {
  DealsChainPage,
  ExpensesPage,
  MessagingPage,
  ProductsPage,
  ResourcesPage,
  TeamPage,
} from "@/features/shared/ModulePlaceholder";
import {
  AgendaPage,
  AuditPage,
  DocumentsPage,
  InvoicingPage,
  ProspectsPage,
  SenderIdPage,
  SettingsPage,
} from "@/features/shared/placeholders";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

/**
 * Les chemins suivent `config/navigation.ts`, qui transcrit les 18 modules de
 * la maquette. `ProtectedRoute` y contrôle la session **et** le rôle.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Ventes */}
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="prospects" element={<ProspectsPage />} />
        <Route path="clients" element={<ClientsPage />} />

        {/* Commercial */}
        <Route path="campagnes" element={<CampaignsPage />} />
        <Route path="chaine-commerciale" element={<DealsChainPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="sender-id" element={<SenderIdPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="facturation" element={<InvoicingPage />} />
        <Route path="notes-de-frais" element={<ExpensesPage />} />
        <Route path="messagerie" element={<MessagingPage />} />

        {/* Pilotage & contrôle */}
        <Route path="reporting" element={<ReportsPage />} />
        <Route path="equipe" element={<TeamPage />} />
        <Route path="audit" element={<AuditPage />} />

        {/* Formation et système */}
        <Route path="ressources" element={<ResourcesPage />} />
        <Route path="produits" element={<ProductsPage />} />
        <Route path="parametres" element={<SettingsPage />} />

        {/* Chemin inconnu : on renvoie au tableau de bord. */}
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

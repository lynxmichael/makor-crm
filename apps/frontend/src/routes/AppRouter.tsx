import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";

import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";

import { LoginPage } from "@/features/auth/LoginPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { PipelinePage } from "@/features/opportunities/PipelinePage";
import { CampaignsPage } from "@/features/campaigns/CampaignsPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { MessagesPage } from "@/features/messages/MessagesPage";
import { TwoFactorSetupPage } from "@/features/auth/TwoFactorSetupPage";
import { ResourcesPage } from "@/features/resources/ResourcesPage";
import { NotFoundPage } from "@/features/shared/ErrorPages";
import { PublicSignaturePage } from "@/features/signatures/PublicSignaturePage";

import { ResourceModulePage } from "@/features/shared/ResourceModulePage";
import { MODULE_CONFIGS } from "@/features/shared/module-configs";

import { SettingsPage } from "@/features/settings/SettingsPage";

import { QuotesPage } from "@/features/quotes/QuotesPage";
import { InvoicesPage } from "@/features/invoices/InvoicesPage";
import { UsersPage } from "@/features/users/UsersPage";
import { ApiKeysPage } from "@/features/api-keys/ApiKeysPage";
import { CommissionsPage } from "@/features/commissions/CommissionsPage";
import { WorkflowsPage } from "@/features/workflows/WorkflowsPage";
import { ScoringPage } from "@/features/scoring/ScoringPage";
import { DirectoryPage } from "@/features/directory/DirectoryPage";
import { EvaluationPage } from "@/features/evaluation/EvaluationPage";

/**
 * Table de routage unique de l'application.
 *
 * `AnimatePresence` est branché sur le pathname pour que la sortie d'une
 * page s'exécute avant l'entrée de la suivante ; les pages elles-mêmes
 * n'ont rien à savoir de la transition.
 */
export function AppRouter() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Signature client — hors de PublicRoute comme de ProtectedRoute :
            le signataire n'a pas de compte, et un agent déjà connecté qui
            ouvre le lien ne doit pas être renvoyé au tableau de bord. */}
        <Route path="/signature/:token" element={<PublicSignaturePage />} />

        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="annuaire" element={<DirectoryPage />} />
            <Route path="prospects" element={<ResourceModulePage config={MODULE_CONFIGS.prospects} />} />
            <Route path="opportunities" element={<PipelinePage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="contracts" element={<ResourceModulePage config={MODULE_CONFIGS.contrats} />} />
            <Route path="agenda" element={<ResourceModulePage config={MODULE_CONFIGS.agenda} />} />
            <Route path="securite/2fa" element={<TwoFactorSetupPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="ressources" element={<ResourcesPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="sender-id" element={<ResourceModulePage config={MODULE_CONFIGS.senderId} />} />
            <Route path="documents" element={<ResourceModulePage config={MODULE_CONFIGS.documents} />} />
            <Route path="invoicing" element={<InvoicesPage />} />
            <Route path="payments" element={<ResourceModulePage config={MODULE_CONFIGS.encaissements} />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit" element={<ResourceModulePage config={MODULE_CONFIGS.audit} />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="commissions" element={<CommissionsPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="priorites" element={<ScoringPage />} />
            <Route path="evaluation" element={<EvaluationPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  );
}

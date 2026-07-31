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
import { NotFoundPage } from "@/features/shared/ErrorPages";

import {
  AgendaPage,
  AuditPage,
  ContractsPage,
  DocumentsPage,
  InvoicingPage,
  PaymentsPage,
  ProspectsPage,
  PurchaseOrdersPage,
  QuotesPage,
  SenderIdPage,
  SettingsPage,
} from "@/features/shared/placeholders";

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
            <Route path="prospects" element={<ProspectsPage />} />
            <Route path="opportunities" element={<PipelinePage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="securite/2fa" element={<TwoFactorSetupPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="sender-id" element={<SenderIdPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="invoicing" element={<InvoicingPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  );
}

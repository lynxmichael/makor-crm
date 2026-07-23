import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { PipelinePage } from "@/features/opportunities/PipelinePage";
import { CampaignsPage } from "@/features/campaigns/CampaignsPage";
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
  ReportsPage,
  SenderIdPage,
  SettingsPage,
} from "@/features/shared/placeholders";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="prospects" element={<ProspectsPage />} />
        <Route path="opportunities" element={<PipelinePage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="sender-id" element={<SenderIdPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="invoicing" element={<InvoicingPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

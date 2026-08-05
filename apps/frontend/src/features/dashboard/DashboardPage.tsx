import { ROLE_DASHBOARD_SUBTITLES } from "@/config/roles";
import { useAuth } from "@/hooks/useAuth";
import { AdminVentesDashboard } from "@/features/dashboard/AdminVentesDashboard";
import { CommercialDashboard } from "@/features/dashboard/CommercialDashboard";
import { FinanceDashboard } from "@/features/dashboard/FinanceDashboard";
import { SuperAdminDashboard } from "@/features/dashboard/SuperAdminDashboard";
import { SuperviseurDashboard } from "@/features/dashboard/SuperviseurDashboard";

/**
 * Aiguillage du tableau de bord.
 *
 * Le CDC §4.1 exige cinq vues distinctes, pas une vue commune filtrée : les
 * indicateurs, les graphiques et les actions changent entièrement selon le
 * rôle. Chaque composant appelle son propre endpoint, déjà gardé par son
 * `@Roles()` côté API.
 */
export function DashboardPage() {
  const { user, role } = useAuth();

  if (!user || !role) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-text">
          Bonjour {user.firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted">{ROLE_DASHBOARD_SUBTITLES[role]}</p>
      </header>

      {role === "SUPER_ADMIN" && <SuperAdminDashboard />}
      {role === "ADMIN_VENTES" && <AdminVentesDashboard />}
      {role === "SUPERVISEUR" && <SuperviseurDashboard />}
      {role === "COMMERCIAL" && <CommercialDashboard />}
      {role === "FINANCE" && <FinanceDashboard />}
    </div>
  );
}

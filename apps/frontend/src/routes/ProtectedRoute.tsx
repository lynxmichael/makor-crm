import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "@/store/auth.store";
import { ROUTE_ROLES } from "@/config/navigation";
import { ForbiddenPage } from "@/features/shared/ErrorPages";

/**
 * Garde d'accès. Deux refus distincts, à ne pas confondre :
 *  — pas de session  → redirection vers la connexion, avec mémoire de la
 *    page demandée pour y revenir après ;
 *  — session valide mais rôle insuffisant → écran 403, pas de redirection :
 *    renvoyer vers l'accueil laisserait croire à un bug.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const role = useAuthStore((s) => s.user?.role?.name ?? null);
  const needsTwoFactorSetup = useAuthStore((s) => s.needsTwoFactorSetup());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Obligation de 2FA non satisfaite : on enferme la session sur cet écran.
  // La session est valide — le backend a bien délivré les jetons — mais le
  // rôle donne accès à des données sensibles, et le CDC §2.4 impose la
  // double authentification avant tout le reste.
  if (needsTwoFactorSetup && location.pathname !== "/securite/2fa") {
    return <Navigate to="/securite/2fa" replace />;
  }

  const allowed = ROUTE_ROLES[location.pathname];

  if (allowed && role && !allowed.includes(role)) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}

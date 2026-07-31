import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "@/store/auth.store";

/**
 * Écrans réservés aux visiteurs non connectés (connexion, mot de passe
 * oublié). Une session active y renvoie d'où l'on venait, ou au tableau
 * de bord.
 */
export function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  if (isAuthenticated) {
    return <Navigate to={from && from !== "/login" ? from : "/"} replace />;
  }

  return <Outlet />;
}

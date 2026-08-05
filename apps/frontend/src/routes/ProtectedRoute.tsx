import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { canAccessPath, firstAllowedPath } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Barrière d'accès.
 *
 * Deux contrôles, pas un : la session, puis le rôle. Saisir `/audit` dans la
 * barre d'adresse en tant que Commercial ne doit pas afficher l'écran sous
 * prétexte que le lien est absent du menu — même règle que celle qu'applique
 * `applyRole()` dans la maquette, qui bascule sur le premier module autorisé.
 *
 * Ce contrôle n'est qu'une commodité d'interface : l'autorité reste l'API, où
 * chaque route porte son `@Roles()`.
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessPath(role, location.pathname)) {
    return <Navigate to={firstAllowedPath(role)} replace />;
  }

  return children;
}

export default ProtectedRoute;

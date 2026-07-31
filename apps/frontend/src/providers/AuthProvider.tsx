import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/store/auth.store";
import { SplashScreen } from "@/components/shared/SplashScreen";

/**
 * Revalide la session persistée avant de laisser le routeur décider quoi
 * afficher. Sans ce garde-fou, un rechargement de page ferait clignoter
 * l'écran de connexion avant de revenir au tableau de bord.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Quand l'intercepteur constate que la session est perdue, il vide le
  // store : on ramène alors l'utilisateur vers la connexion.
  useEffect(() => {
    if (!bootstrapping && !accessToken) {
      const path = window.location.pathname;
      if (path !== "/login" && !path.startsWith("/reset-password")) {
        navigate("/login", { replace: true, state: { from: path } });
      }
    }
  }, [accessToken, bootstrapping, navigate]);

  if (bootstrapping) return <SplashScreen />;

  return <>{children}</>;
}

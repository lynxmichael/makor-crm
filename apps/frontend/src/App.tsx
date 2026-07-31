import { AuthProvider } from "@/providers/AuthProvider";
import { AppRouter } from "@/routes/AppRouter";

/**
 * L'application se réduit à deux choses : garantir qu'on sait qui est
 * connecté, puis router. Toute la table des écrans vit dans AppRouter.
 */
export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

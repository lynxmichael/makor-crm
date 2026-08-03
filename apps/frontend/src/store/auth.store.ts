import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { connectAuthBridge } from "@/services/api";
import { authService } from "@/services/auth";
import { STORAGE_KEYS, type RoleName } from "@/config/constants";
import type { AuthUser, SessionTokens } from "@/types/api";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Le backend demande à ce compte de configurer sa 2FA (rôle sensible). */
  twoFactorSetupRequired: boolean;
  /** Vrai tant que la session persistée n'a pas été revalidée au démarrage. */
  bootstrapping: boolean;

  setSession: (session: SessionTokens) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;

  isAuthenticated: () => boolean;
  role: () => RoleName | null;
  hasRole: (...roles: RoleName[]) => boolean;
  /** Obligation de 2FA, recalculée depuis le profil (survit au rechargement). */
  needsTwoFactorSetup: () => boolean;
  completeTwoFactorSetup: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      twoFactorSetupRequired: false,
      bootstrapping: true,

      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          // Le repli local a été retiré : quand le serveur ne dit rien,
          // c'est qu'il n'impose rien. Deviner à sa place rouvrait la
          // divergence que ce correctif ferme.
          twoFactorSetupRequired: session.twoFactorSetupRequired ?? false,
          bootstrapping: false,
        }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      clear: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          twoFactorSetupRequired: false,
          bootstrapping: false,
        }),

      logout: async () => {
        const token = get().refreshToken;
        // La révocation côté serveur est souhaitable mais ne doit jamais
        // empêcher l'utilisateur de se déconnecter localement.
        if (token) await authService.logout(token).catch(() => undefined);
        get().clear();
      },

      /**
       * Au chargement, on a peut-être un jeton en mémoire locale mais rien ne
       * dit qu'il est encore valide ni que le rôle n'a pas changé. On
       * revalide auprès du serveur avant d'afficher quoi que ce soit.
       */
      bootstrap: async () => {
        if (!get().accessToken) {
          set({ bootstrapping: false });
          return;
        }

        try {
          const me = await authService.me();

          // `/users/me` porte le verdict du serveur sur l'obligation de 2FA.
          // On le reporte ici plutôt que de le recalculer : c'est ce qui
          // permet à l'échappatoire de recette de fonctionner, et ce qui
          // fait survivre l'obligation à un rechargement de page.
          const { twoFactorSetupRequired = false, ...user } = me as typeof me & {
            twoFactorSetupRequired?: boolean;
          };

          set({ user, twoFactorSetupRequired, bootstrapping: false });
        } catch {
          // L'intercepteur a déjà tenté le renouvellement : si on arrive
          // ici, la session est bel et bien perdue.
          get().clear();
        }
      },

      isAuthenticated: () => Boolean(get().accessToken && get().user),
      role: () => get().user?.role?.name ?? null,
      hasRole: (...roles) => {
        const current = get().user?.role?.name;
        return Boolean(current && roles.includes(current));
      },

      /**
       * Le drapeau `twoFactorSetupRequired` vient de la réponse de connexion
       * et n'est pas persisté : après un rechargement de page il retombe à
       * faux, alors que l'obligation, elle, tient toujours. On le recalcule
       * donc à partir du profil, qui est persisté et revalidé au démarrage.
       */
      /**
       * L'obligation est décidée par le serveur, jamais recalculée ici.
       *
       * Redériver la règle côté client la faisait diverger de la règle
       * serveur : l'échappatoire de recette TWO_FACTOR_ENFORCED=false était
       * ignorée par le frontend, qui continuait d'imposer l'écran de mise en
       * place. `GET /users/me` renvoie désormais `twoFactorSetupRequired`, et
       * `bootstrap()` le reporte dans le store — ce qui règle aussi le cas du
       * rechargement de page, puisque la valeur est revalidée au démarrage.
       */
      needsTwoFactorSetup: () => Boolean(get().user) && get().twoFactorSetupRequired,

      /** Appelé une fois la 2FA activée et les codes de secours conservés. */
      completeTwoFactorSetup: () =>
        set((state) => ({
          twoFactorSetupRequired: false,
          user: state.user ? { ...state.user, twoFactorEnabled: true } : null,
        })),
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: createJSONStorage(() => localStorage),
      // On ne persiste que le strict nécessaire : le profil complet est
      // rechargé à chaque démarrage par bootstrap().
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);

// Branchement du client HTTP sur le store. Fait ici, une seule fois, au
// chargement du module — l'intercepteur n'a ainsi jamais besoin d'importer
// le store (ce qui créerait un cycle).
connectAuthBridge({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onRefreshed: (accessToken, refreshToken) =>
    useAuthStore.getState().setTokens(accessToken, refreshToken),
  onSessionExpired: () => useAuthStore.getState().clear(),
});

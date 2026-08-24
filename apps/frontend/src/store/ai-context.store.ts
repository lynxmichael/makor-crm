import { create } from "zustand";

/** Ressources sur lesquelles l'assistant sait travailler. */
export type AiContextResource = "quotes" | "contracts" | "deals" | "campaigns";

interface AiContext {
  resource: AiContextResource;
  entityId: string;
  /** Libellé affiché pour confirmer de quoi on parle — numéro, intitulé. */
  label: string;
}

interface AiContextState {
  context: AiContext | null;
  setContext: (context: AiContext) => void;
  /** À appeler à la fermeture de la fiche : le contexte ne survit pas à l'écran. */
  clearContext: (entityId?: string) => void;
}

/**
 * Fiche actuellement ouverte, à l'usage de l'assistant de rédaction.
 *
 * Sans ce relais, l'assistant sait sur quel écran on se trouve mais pas quelle
 * pièce y est ouverte : il faut la rechercher à la main alors qu'elle est
 * sous les yeux.
 *
 * Un store plutôt qu'un contexte React : l'assistant vit dans la barre
 * supérieure, les écrans dans le corps de la page — les deux n'ont pas
 * d'ancêtre commun qui ne soit pas la racine, et faire descendre la valeur
 * par les props traverserait toute l'application.
 */
export const useAiContextStore = create<AiContextState>((set, get) => ({
  context: null,

  setContext: (context) => set({ context }),

  clearContext: (entityId) => {
    // L'effacement est ciblé : deux fiches peuvent se fermer dans le
    // désordre, et une fermeture tardive ne doit pas effacer le contexte
    // qu'une ouverture plus récente vient de poser.
    if (entityId && get().context?.entityId !== entityId) return;
    set({ context: null });
  },
}));

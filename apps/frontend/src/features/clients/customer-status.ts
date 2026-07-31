import type { CustomerStatus } from "@/types/api";

/**
 * Le backend stocke des codes, l'interface parle français. Centralisé ici
 * parce que la liste, le formulaire et le filtre doivent dire la même chose.
 */
export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  SUSPENDED: "Suspendu",
};

export const CUSTOMER_STATUS_TONES: Record<CustomerStatus, "signal" | "neutral" | "alert"> = {
  ACTIVE: "signal",
  INACTIVE: "neutral",
  SUSPENDED: "alert",
};

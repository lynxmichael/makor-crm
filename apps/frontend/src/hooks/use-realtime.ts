import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  connectRealtime,
  disconnectRealtime,
  onRealtime,
  type RealtimeEventName,
  type RealtimeEvents,
} from "@/services/realtime";
import { useAuthStore } from "@/store/auth.store";
import { QK } from "@/config/constants";

/**
 * Branche la connexion temps réel sur le cycle de vie de la session.
 *
 * Monté une seule fois, au niveau de l'application : chaque événement reçu
 * se contente d'invalider les clés de cache concernées, et TanStack Query
 * refait la requête. On évite ainsi d'écrire les données du socket
 * directement dans le cache — le serveur reste la seule source de vérité,
 * et un message perdu pendant une coupure ne laisse pas l'écran incohérent.
 */
export function useRealtimeConnection() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!accessToken) {
      disconnectRealtime();
      return;
    }

    connectRealtime(accessToken);

    const invalidate = (...keys: readonly (readonly string[])[]) => {
      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const unsubscribers = [
      onRealtime("message:new", (payload) => {
        invalidate(["messages"]);

        // Seul le destinataire est alerté : l'expéditeur sait déjà qu'il a
        // écrit, et un avertissement sur son propre envoi serait du bruit.
        if (payload.recipientId === currentUserId) {
          toast.info("Nouveau message reçu");
        }
      }),

      onRealtime("message:sent", () => invalidate(["messages"])),

      onRealtime("notification:new", () => invalidate(QK.notifications)),

      onRealtime("comment:created", (payload) =>
        invalidate(["comments", payload.entityType, payload.entityId]),
      ),

      onRealtime("comment:mentioned", () => {
        invalidate(["comments"]);
        toast.info("Vous avez été mentionné dans un commentaire");
      }),

      onRealtime("campaign:updated", () => invalidate(QK.campaigns)),

      onRealtime("campaign:anomaly", (payload) => {
        invalidate(QK.campaigns);
        toast.error(
          payload.reason
            ? `Anomalie sur une campagne : ${String(payload.reason)}`
            : "Anomalie détectée sur une campagne en cours",
        );
      }),
    ];

    return () => {
      for (const off of unsubscribers) off();
    };
  }, [accessToken, currentUserId, queryClient]);
}

/**
 * Abonnement ponctuel depuis un écran, quand l'invalidation globale ne
 * suffit pas — par exemple pour animer une ligne qui vient de changer.
 */
export function useRealtimeEvent<E extends RealtimeEventName>(
  event: E,
  handler: (payload: RealtimeEvents[E]) => void,
) {
  useEffect(() => onRealtime(event, handler), [event, handler]);
}

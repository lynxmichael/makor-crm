import { io, type Socket } from "socket.io-client";

import { env } from "@/config/env";

/** Événements émis par `RealtimeGateway` côté serveur. */
export interface RealtimeEvents {
  "notification:new": { id: string; userId: string; [key: string]: unknown };
  "message:new": { id: string; senderId: string; recipientId: string };
  "message:sent": { id: string; senderId: string; recipientId: string };
  "comment:created": { entityType: string; entityId: string | null };
  "comment:mentioned": { id: string; entityType: string; entityId: string | null };
  "campaign:updated": { id: string; status: string; [key: string]: unknown };
  "campaign:anomaly": { id: string; reason?: string; [key: string]: unknown };
}

export type RealtimeEventName = keyof RealtimeEvents;

let socket: Socket | null = null;

/**
 * Connexion temps réel, en instance unique.
 *
 * Un socket par onglet suffit : ouvrir une connexion par composant
 * multiplierait les sessions côté serveur pour le même utilisateur, et
 * chaque montage de composant coûterait une poignée de main.
 *
 * L'authentification réutilise le JWT de l'API — la passerelle le vérifie
 * avec le même secret, il n'y a donc pas de session parallèle à gérer.
 */
export function connectRealtime(token: string): Socket {
  if (socket?.connected) return socket;

  // Une connexion existante mais périmée (jeton renouvelé) est fermée avant
  // d'en ouvrir une nouvelle, sinon les deux coexistent.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(env.serverUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    // Plafond volontairement bas : sur un CRM ouvert toute la journée, une
    // reconnexion qui traîne se traduit par des données figées à l'écran.
    reconnectionDelayMax: 10_000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

export function disconnectRealtime() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function getRealtimeSocket(): Socket | null {
  return socket;
}

/**
 * Abonnement à un événement. Renvoie la fonction de désabonnement, à appeler
 * au démontage — sans quoi les écouteurs s'accumulent à chaque navigation.
 */
export function onRealtime<E extends RealtimeEventName>(
  event: E,
  handler: (payload: RealtimeEvents[E]) => void,
): () => void {
  const current = socket;
  if (!current) return () => undefined;

  current.on(event as string, handler as (...args: unknown[]) => void);
  return () => {
    current.off(event as string, handler as (...args: unknown[]) => void);
  };
}

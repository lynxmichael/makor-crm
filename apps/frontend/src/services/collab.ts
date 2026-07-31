import { api, http } from "./api";
import type { Paginated } from "@/types/api";
import type {
  AiGeneration,
  AiStatus,
  AiTaskType,
  Comment,
  CommentEntityType,
  Conversation,
  Message,
  Thread,
} from "@/types/collab";

// ---------------------------------------------------------------------------
// Commentaires — miroir de comments.controller.ts
// ---------------------------------------------------------------------------

export const commentsService = {
  /** `entityId` omis pour les portées globales (DASHBOARD). */
  list: (entityType: CommentEntityType, entityId?: string, page = 1, limit = 20) =>
    http.get<Paginated<Comment>>("/comments", {
      params: { entityType, entityId, page, limit },
    }),

  count: (entityType: CommentEntityType, entityId?: string) =>
    http.get<{ count: number }>("/comments/count", { params: { entityType, entityId } }),

  create: (body: {
    body: string;
    entityType: CommentEntityType;
    entityId?: string;
    parentId?: string;
    mentionedUserIds?: string[];
  }) => http.post<Comment>("/comments", body),

  update: (id: string, body: string) => http.patch<Comment>(`/comments/${id}`, { body }),

  remove: (id: string) => http.delete<{ id: string }>(`/comments/${id}`),
};

// ---------------------------------------------------------------------------
// Messagerie interne — miroir de messages.controller.ts
// ---------------------------------------------------------------------------

export const messagesService = {
  inbox: (params: { page?: number; limit?: number; search?: string; unread?: "true" } = {}) =>
    http.get<Paginated<Message>>("/messages", { params }),

  sent: (params: { page?: number; limit?: number } = {}) =>
    http.get<Paginated<Message>>("/messages/sent", { params }),

  conversations: () => http.get<Conversation[]>("/messages/conversations"),

  thread: (partnerId: string) => http.get<Thread>(`/messages/thread/${partnerId}`),

  unreadCount: () => http.get<{ count: number }>("/messages/unread-count"),

  /**
   * Envoi en multipart dès qu'il y a une pièce jointe. On laisse le
   * navigateur poser lui-même le Content-Type : fixer la valeur à la main
   * omettrait la « boundary » et le backend rejetterait la requête.
   */
  send: (input: { recipientId: string; subject?: string; body: string; file?: File | null }) => {
    if (!input.file) {
      return http.post<Message>("/messages", {
        recipientId: input.recipientId,
        subject: input.subject,
        body: input.body,
      });
    }

    const form = new FormData();
    form.append("recipientId", input.recipientId);
    if (input.subject) form.append("subject", input.subject);
    form.append("body", input.body);
    form.append("file", input.file);

    return api
      .post<Message>("/messages", form, { headers: { "Content-Type": undefined } })
      .then((r) => r.data);
  },

  markAsRead: (id: string) => http.patch<Message>(`/messages/${id}/read`),

  remove: (id: string) => http.delete<{ id: string; purged: boolean }>(`/messages/${id}`),
};

// ---------------------------------------------------------------------------
// Génération assistée — miroir de ai.controller.ts
// ---------------------------------------------------------------------------

export const aiService = {
  status: () => http.get<AiStatus>("/ai/status"),

  generate: (body: { taskType: AiTaskType; entityId: string; instruction?: string }) =>
    http.post<AiGeneration>("/ai/generate", body),

  history: (entityType: CommentEntityType, entityId: string) =>
    http.get<AiGeneration[]>("/ai/history", { params: { entityType, entityId } }),

  accept: (id: string, accepted = true) =>
    http.patch<AiGeneration>(`/ai/${id}/accept`, { accepted }),
};

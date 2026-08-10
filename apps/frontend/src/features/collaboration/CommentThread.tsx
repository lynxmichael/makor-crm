import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Pencil, Reply, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/shared/DataState";
import { Skeleton } from "@/components/ui/skeleton";

import { commentsService } from "@/services/collab";
import { useAuthStore } from "@/store/auth.store";
import { formatRelative, initials } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import type { ApiError } from "@/types/api";
import type { Comment, CommentEntityType } from "@/types/collab";

interface Props {
  entityType: CommentEntityType;
  /** Omis pour les portées globales — le fil du tableau de bord, par exemple. */
  entityId?: string;
  title?: string;
  /** Texte de l'écran vide, à adapter au contexte d'usage. */
  emptyDetail?: string;
}

/**
 * Fil de commentaires réutilisable (CDC §4.1).
 *
 * Volontairement autonome : il gère son propre chargement, ses mutations et
 * son cache. Une fiche client ou une facture proforma n'a qu'à le poser avec son type et
 * son identifiant, sans rien remonter dans son propre état.
 */
export function CommentThread({ entityType, entityId, title = "Commentaires", emptyDetail }: Props) {
  const queryClient = useQueryClient();
  const reduced = usePrefersReducedMotion();
  const currentUser = useAuthStore((s) => s.user);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const queryKey = ["comments", entityType, entityId ?? null];

  const query = useQuery({
    queryKey,
    queryFn: () => commentsService.list(entityType, entityId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const create = useMutation({
    mutationFn: () =>
      commentsService.create({
        body: draft.trim(),
        entityType,
        entityId,
        parentId: replyTo?.id,
      }),
    onSuccess: () => {
      setDraft("");
      setReplyTo(null);
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const update = useMutation({
    mutationFn: (comment: Comment) => commentsService.update(comment.id, editDraft.trim()),
    onSuccess: () => {
      setEditing(null);
      setEditDraft("");
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => commentsService.remove(id),
    onSuccess: () => {
      toast.success("Commentaire supprimé");
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const comments = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  /** Le backend applique la même règle ; ici, c'est pour ne pas afficher un bouton qui échouerait. */
  function canModify(comment: Comment) {
    return comment.authorId === currentUser?.id || currentUser?.role?.name === "SUPER_ADMIN";
  }

  function startEdit(comment: Comment) {
    setEditing(comment);
    setEditDraft(comment.body);
  }

  function renderComment(comment: Comment, isReply = false) {
    const isEditing = editing?.id === comment.id;

    return (
      <motion.li
        key={comment.id}
        variants={reduced ? undefined : staggerItem}
        className={isReply ? "ml-11 border-l-2 border-line pl-4" : ""}
      >
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wire/10 text-xs font-semibold text-wire">
            {initials(comment.author.firstName, comment.author.lastName)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium text-ink">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              {comment.author.jobTitle && (
                <span className="text-xs text-slate">{comment.author.jobTitle}</span>
              )}
              <span className="text-xs text-slate">·</span>
              <span className="text-xs text-slate">{formatRelative(comment.createdAt)}</span>
              {comment.editedAt && <span className="text-xs text-slate">(modifié)</span>}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  rows={3}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => update.mutate(comment)}
                    disabled={update.isPending || !editDraft.trim()}
                  >
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {comment.body}
              </p>
            )}

            {!isEditing && (
              <div className="mt-1.5 flex gap-1">
                {!isReply && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-slate"
                    onClick={() => setReplyTo(comment)}
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Répondre
                  </Button>
                )}

                {canModify(comment) && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-slate"
                      onClick={() => startEdit(comment)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-alert hover:bg-alert/10"
                      onClick={() => remove.mutate(comment.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </>
                )}
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <ul className="mt-4 space-y-4">
                {comment.replies.map((reply) => renderComment(reply, true))}
              </ul>
            )}
          </div>
        </div>
      </motion.li>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <MessageSquare className="h-4 w-4 text-slate" />
        <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
        {total > 0 && (
          <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-slate">
            {total}
          </span>
        )}
      </header>

      {/* Saisie en haut : le fil est trié du plus récent au plus ancien,
          le champ doit être là où la réponse apparaîtra. */}
      <div className="border-b border-line px-5 py-4">
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-xs text-slate"
            >
              <span className="truncate">
                Réponse à {replyTo.author.firstName} {replyTo.author.lastName}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Annuler la réponse"
                className="ml-2 shrink-0 rounded p-0.5 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <Textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={replyTo ? "Votre réponse…" : "Ajouter un commentaire…"}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Entrée pour publier : Entrée seule doit rester un
            // retour à la ligne dans un commentaire de plusieurs phrases.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.trim()) {
              create.mutate();
            }
          }}
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate">Ctrl + Entrée pour publier</span>
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending || !draft.trim()}>
            <Send className="h-3.5 w-3.5" />
            Publier
          </Button>
        </div>
      </div>

      <div className="px-5 py-4">
        {query.isPending ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aucun commentaire"
            detail={emptyDetail ?? "Ouvrez la discussion — vos collègues verront votre message ici."}
          />
        ) : (
          <motion.ul
            variants={reduced ? undefined : staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-5"
          >
            {comments.map((comment) => renderComment(comment))}
          </motion.ul>
        )}
      </div>
    </section>
  );
}

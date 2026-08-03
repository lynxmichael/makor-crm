import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, MessagesSquare, Paperclip, Search, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/shared/DataState";
import { Skeleton } from "@/components/ui/skeleton";

import { messagesService } from "@/services/collab";
import { usersService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime, formatRelative, initials } from "@/lib/format";
import { openFile } from "@/services/api";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { Conversation } from "@/types/collab";

const MAX_ATTACHMENT = 20 * 1024 * 1024;

export function MessagesPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [searchParams, setSearchParams] = useSearchParams();
  const partnerId = searchParams.get("with") ?? undefined;

  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [composing, setComposing] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const scrollAnchor = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: () => messagesService.conversations(),
  });

  const thread = useQuery({
    queryKey: ["messages", "thread", partnerId],
    queryFn: () => messagesService.thread(partnerId!),
    enabled: Boolean(partnerId),
  });

  // Liste des collègues, chargée seulement à l'ouverture du compositeur.
  const colleagues = useQuery({
    queryKey: ["users", "for-messaging"],
    queryFn: () => usersService.list({ limit: 100 }),
    enabled: composing,
  });

  const send = useMutation({
    mutationFn: (recipientId: string) =>
      messagesService.send({ recipientId, body: draft.trim(), file }),
    onSuccess: (message) => {
      setDraft("");
      setFile(null);
      setComposing(false);
      if (fileInput.current) fileInput.current.value = "";
      setSearchParams({ with: message.recipientId }, { replace: true });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  // Le fil est trié du plus ancien au plus récent : on colle en bas à
  // l'ouverture et à chaque nouveau message, comme dans une messagerie.
  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ block: "end" });
  }, [thread.data?.messages.length]);

  const items = (conversations.data ?? []).filter((c) =>
    search
      ? `${c.partner.firstName} ${c.partner.lastName}`.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;

    if (picked && picked.size > MAX_ATTACHMENT) {
      toast.error("Pièce jointe trop lourde : 20 Mo maximum.");
      event.target.value = "";
      return;
    }

    setFile(picked);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Messages</h1>
          <p className="mt-1 text-sm text-slate">
            Échanges internes entre collègues. Chaque message envoie aussi une notification par
            e-mail au destinataire.
          </p>
        </div>

        <Button onClick={() => setComposing(true)}>
          <Send className="h-4 w-4" />
          Nouveau message
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Conversations */}
        <aside className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un collègue"
                className="pl-9"
                aria-label="Rechercher une conversation"
              />
            </div>
          </div>

          <div className="scrollbar-thin max-h-[60vh] overflow-y-auto">
            {conversations.isPending ? (
              <div className="space-y-3 p-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate">
                {search ? "Aucun collègue à ce nom." : "Aucune conversation pour l'instant."}
              </p>
            ) : (
              <ul>
                {items.map((conversation: Conversation) => {
                  const active = conversation.partner.id === partnerId;

                  return (
                    <li key={conversation.partner.id}>
                      <button
                        type="button"
                        onClick={() => setSearchParams({ with: conversation.partner.id })}
                        className={cn(
                          "flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0",
                          active ? "bg-wire/5" : "hover:bg-paper",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wire/10 text-xs font-semibold text-wire">
                          {initials(conversation.partner.firstName, conversation.partner.lastName)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium text-ink">
                              {conversation.partner.firstName} {conversation.partner.lastName}
                            </span>
                            <span className="shrink-0 text-xs text-slate">
                              {formatRelative(conversation.lastMessage.createdAt)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span className="truncate text-xs text-slate">
                              {conversation.lastMessage.body}
                            </span>
                            {conversation.unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-pulse px-1.5 text-[10px] font-semibold text-white">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Fil */}
        <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-xl border border-line bg-surface">
          {composing ? (
            <Composer
              colleagues={colleagues.data?.data ?? []}
              loading={colleagues.isPending}
              draft={draft}
              onDraft={setDraft}
              file={file}
              onPickFile={pickFile}
              onClearFile={() => {
                setFile(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
              fileInputRef={fileInput}
              pending={send.isPending}
              onSend={(recipientId) => send.mutate(recipientId)}
              onCancel={() => setComposing(false)}
            />
          ) : !partnerId ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={MessagesSquare}
                title="Aucune conversation ouverte"
                detail="Choisissez un collègue à gauche, ou démarrez un nouvel échange."
                action={<Button onClick={() => setComposing(true)}>Nouveau message</Button>}
              />
            </div>
          ) : thread.isPending ? (
            <div className="flex-1 space-y-4 p-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-2/3" />
              ))}
            </div>
          ) : thread.isError ? (
            <div className="flex-1 p-6">
              <ErrorState error={thread.error as ApiError} onRetry={() => void thread.refetch()} />
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wire/10 text-xs font-semibold text-wire">
                  {initials(thread.data.partner.firstName, thread.data.partner.lastName)}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {thread.data.partner.firstName} {thread.data.partner.lastName}
                  </p>
                  {thread.data.partner.jobTitle && (
                    <p className="text-xs text-slate">{thread.data.partner.jobTitle}</p>
                  )}
                </div>
              </header>

              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {thread.data.messages.map((message) => {
                  const mine = message.senderId === currentUser?.id;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5",
                          mine
                            ? "rounded-br-sm bg-wire text-white"
                            : "rounded-bl-sm bg-paper text-ink",
                        )}
                      >
                        {message.subject && (
                          <p className="mb-1 text-xs font-semibold opacity-80">{message.subject}</p>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>

                        {message.attachmentPath && (
                          <button
                            type="button"
                            onClick={() =>
                              void openFile(
                                message.attachmentPath!,
                                message.attachmentName ?? undefined,
                              )
                            }
                            className={cn(
                              "mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs underline-offset-2 hover:underline",
                              mine ? "bg-white/15" : "bg-surface",
                            )}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            {message.attachmentName}
                          </button>
                        )}

                        <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-slate")}>
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={scrollAnchor} />
              </div>

              <div className="border-t border-line p-4">
                {file && (
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-xs text-slate">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInput.current) fileInput.current.value = "";
                      }}
                      aria-label="Retirer la pièce jointe"
                      className="ml-2 shrink-0 hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input ref={fileInput} type="file" hidden onChange={pickFile} />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInput.current?.click()}
                    aria-label="Joindre un fichier"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Écrire un message…"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.trim() && partnerId) {
                        send.mutate(partnerId);
                      }
                    }}
                  />

                  <Button
                    onClick={() => partnerId && send.mutate(partnerId)}
                    disabled={send.isPending || !draft.trim()}
                  >
                    {send.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ComposerProps {
  colleagues: { id: string; firstName: string; lastName: string; jobTitle?: string | null }[];
  loading: boolean;
  draft: string;
  onDraft: (value: string) => void;
  file: File | null;
  onPickFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  pending: boolean;
  onSend: (recipientId: string) => void;
  onCancel: () => void;
}

function Composer({
  colleagues,
  loading,
  draft,
  onDraft,
  file,
  onPickFile,
  onClearFile,
  fileInputRef,
  pending,
  onSend,
  onCancel,
}: ComposerProps) {
  const [recipientId, setRecipientId] = useState("");
  const currentUserId = useAuthStore((s) => s.user?.id);

  // On ne se propose pas soi-même : le backend refuse l'envoi à soi-même,
  // autant ne pas offrir le choix.
  const options = colleagues.filter((c) => c.id !== currentUserId);

  return (
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-ink">Nouveau message</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
          Annuler
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="recipient" className="mb-1.5 block text-xs font-medium text-slate">
            Destinataire
          </label>
          <select
            id="recipient"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            disabled={loading}
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire"
          >
            <option value="">{loading ? "Chargement…" : "Choisir un collègue"}</option>
            {options.map((colleague) => (
              <option key={colleague.id} value={colleague.id}>
                {colleague.firstName} {colleague.lastName}
                {colleague.jobTitle ? ` — ${colleague.jobTitle}` : ""}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          rows={8}
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          placeholder="Votre message…"
        />

        {file && (
          <div className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-xs text-slate">
            <span className="flex min-w-0 items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{file.name}</span>
            </span>
            <button type="button" onClick={onClearFile} aria-label="Retirer la pièce jointe">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <input ref={fileInputRef} type="file" hidden onChange={onPickFile} />
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
            Joindre un fichier
          </Button>

          <Button
            onClick={() => onSend(recipientId)}
            disabled={pending || !recipientId || !draft.trim()}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}

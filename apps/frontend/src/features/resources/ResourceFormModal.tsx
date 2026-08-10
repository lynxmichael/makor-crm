import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select, Textarea } from "@/components/ui/Field";

import { resourcesLibraryService } from "@/services/resources-library";
import type { ApiError } from "@/types/api";
import {
  RESOURCE_CATEGORY_LABELS,
  RESOURCE_TYPE_LABELS,
  type Resource,
  type ResourceCategory,
  type ResourceType,
} from "@/types/resource";

interface Props {
  open: boolean;
  onClose: () => void;
  resource: Resource | null;
  /** Un agent non administrateur ouvre cette modale pour lire, pas pour éditer. */
  readOnly: boolean;
}

/**
 * Sert deux usages avec le même composant : le formulaire du Super Admin, et
 * la lecture d'un article pour tous les autres. Les séparer aurait dupliqué
 * l'affichage du contenu pour un bénéfice nul.
 */
export function ResourceFormModal({ open, onClose, resource, readOnly }: Props) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("GENERAL");
  const [type, setType] = useState<ResourceType>("DOCUMENT");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;

    setTitle(resource?.title ?? "");
    setDescription(resource?.description ?? "");
    setCategory(resource?.category ?? "GENERAL");
    setType(resource?.type ?? "DOCUMENT");
    setUrl(resource?.url ?? "");
    setContent(resource?.content ?? "");
    setIsPublished(resource?.isPublished ?? true);
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }, [open, resource]);

  const save = useMutation({
    mutationFn: () =>
      resourcesLibraryService.save({
        id: resource?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        type,
        url: url.trim() || undefined,
        content: content.trim() || undefined,
        isPublished,
        file,
      }),
    onSuccess: () => {
      toast.success(resource ? "Ressource mise à jour" : "Ressource publiée");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  // Lecture seule : on affiche l'article, rien d'autre.
  if (readOnly) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={resource?.title ?? ""}
        description={resource ? RESOURCE_CATEGORY_LABELS[resource.category] : undefined}
        className="max-w-3xl"
      >
        {resource?.description && (
          <p className="mb-4 text-sm leading-relaxed text-slate">{resource.description}</p>
        )}
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {resource?.content || "Cette ressource ne contient pas de texte."}
        </div>
      </Modal>
    );
  }

  const needsFile = type === "DOCUMENT";
  const needsUrl = type === "VIDEO" || type === "LIEN";
  const needsContent = type === "ARTICLE";

  // Le backend refuse un Document sans fichier, une Vidéo sans URL, un
  // Article sans texte. On désactive donc l'envoi plutôt que de laisser
  // partir une requête vouée au 400.
  const canSubmit =
    title.trim().length >= 2 &&
    (!needsFile || Boolean(file) || Boolean(resource?.filePath)) &&
    (!needsUrl || url.trim().length > 0) &&
    (!needsContent || content.trim().length > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resource ? "Modifier la ressource" : "Nouvelle ressource"}
      description="Visible par tous les agents une fois publiée."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <Field label="Titre" htmlFor="res-title" required>
          <Input
            id="res-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Créer et envoyer une facture proforma"
            autoFocus
          />
        </Field>

        <Field label="Description" htmlFor="res-desc">
          <Textarea
            id="res-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="À quoi sert cette ressource, et pour qui ?"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Module concerné" htmlFor="res-cat">
            <Select
              id="res-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as ResourceCategory)}
            >
              {Object.entries(RESOURCE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Type" htmlFor="res-type">
            <Select
              id="res-type"
              value={type}
              onChange={(e) => setType(e.target.value as ResourceType)}
            >
              {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {needsFile && (
          <Field
            label="Fichier"
            htmlFor="res-file"
            required={!resource?.filePath}
            hint={resource?.fileName ? `Fichier actuel : ${resource.fileName}` : "50 Mo maximum."}
          >
            <div className="flex items-center gap-2">
              <input
                ref={fileInput}
                id="res-file"
                type="file"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                <Paperclip className="h-4 w-4" />
                Choisir un fichier
              </Button>

              {file && (
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                    aria-label="Retirer le fichier"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          </Field>
        )}

        {needsUrl && (
          <Field label="Adresse" htmlFor="res-url" required>
            <Input
              id="res-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        )}

        {needsContent && (
          <Field label="Contenu" htmlFor="res-content" required>
            <Textarea
              id="res-content"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Rédigez le guide ici…"
            />
          </Field>
        )}

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-wire"
          />
          Publier immédiatement
          <span className="text-xs text-slate">
            (sinon la ressource reste visible de vous seul)
          </span>
        </label>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !canSubmit}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {resource ? "Enregistrer" : "Publier"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

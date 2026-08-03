import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select, Textarea } from "@/components/ui/Field";

import { http } from "@/services/api";
import {
  ACTION_LABELS,
  OPERATOR_LABELS,
  TRIGGER_LABELS,
  WIRED_TRIGGERS,
} from "./workflow-labels";
import type { ApiError } from "@/types/api";

interface Condition {
  key: string;
  field: string;
  operator: string;
  value: string;
}

interface Action {
  key: string;
  type: string;
  config: Record<string, string>;
}

const newKey = () => Math.random().toString(36).slice(2);

export function WorkflowFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("DEAL_STAGE_CHANGED");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([
    { key: newKey(), type: "NOTIFY_ROLE", config: { roleName: "SUPERVISEUR", title: "", message: "" } },
  ]);

  const create = useMutation({
    mutationFn: () =>
      http.post("/workflows", {
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        trigger,
        conditions: conditions
          .filter((c) => c.field.trim())
          .map((c) => ({
            field: c.field.trim(),
            operator: c.operator,
            // Les opérateurs de présence n'attendent pas de valeur.
            ...(["isSet", "isEmpty"].includes(c.operator) ? {} : { value: c.value }),
          })),
        actions: actions.map((action, index) => ({
          type: action.type,
          config: action.config,
          position: index,
        })),
      }),
    onSuccess: () => {
      toast.success("Règle créée");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  function updateAction(key: string, patch: Partial<Action>) {
    setActions((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  }

  function updateConfig(key: string, field: string, value: string) {
    setActions((prev) =>
      prev.map((a) => (a.key === key ? { ...a, config: { ...a.config, [field]: value } } : a)),
    );
  }

  const canSubmit = name.trim().length > 1 && actions.length > 0;
  const triggerWired = WIRED_TRIGGERS.has(trigger);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle règle d'automatisation"
      description="Un événement déclenche des actions, sous réserve que les conditions soient remplies."
      className="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de la règle" htmlFor="w-name" required>
            <Input
              id="w-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alerter sur grosse affaire en négociation"
              autoFocus
            />
          </Field>

          <Field label="Déclencheur" htmlFor="w-trigger" required>
            <Select id="w-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                  {WIRED_TRIGGERS.has(value) ? "" : " (à instrumenter)"}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {!triggerWired && (
          <p className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/5 px-3 py-2 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            Ce déclencheur n'est pas encore émis par le code métier : la règle sera enregistrée
            mais ne se déclenchera pas tant que le point d'accroche n'aura pas été ajouté.
          </p>
        )}

        <Field label="Description" htmlFor="w-desc">
          <Textarea
            id="w-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="À quoi sert cette règle, et pourquoi ?"
          />
        </Field>

        {/* Conditions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink">Conditions</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setConditions((prev) => [
                  ...prev,
                  { key: newKey(), field: "", operator: "gte", value: "" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>

          {conditions.length === 0 ? (
            <p className="rounded-lg bg-paper px-3 py-3 text-sm text-slate">
              Aucune condition : la règle s'exécutera à chaque déclenchement.
            </p>
          ) : (
            <div className="space-y-2">
              {conditions.map((condition) => (
                <div key={condition.key} className="flex flex-wrap items-center gap-2">
                  <Input
                    value={condition.field}
                    onChange={(e) =>
                      setConditions((prev) =>
                        prev.map((c) =>
                          c.key === condition.key ? { ...c, field: e.target.value } : c,
                        ),
                      )
                    }
                    placeholder="amount"
                    className="max-w-[160px]"
                    aria-label="Champ"
                  />

                  <Select
                    value={condition.operator}
                    onChange={(e) =>
                      setConditions((prev) =>
                        prev.map((c) =>
                          c.key === condition.key ? { ...c, operator: e.target.value } : c,
                        ),
                      )
                    }
                    className="max-w-[190px]"
                    aria-label="Opérateur"
                  >
                    {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>

                  {!["isSet", "isEmpty"].includes(condition.operator) && (
                    <Input
                      value={condition.value}
                      onChange={(e) =>
                        setConditions((prev) =>
                          prev.map((c) =>
                            c.key === condition.key ? { ...c, value: e.target.value } : c,
                          ),
                        )
                      }
                      placeholder="1000000"
                      className="max-w-[160px]"
                      aria-label="Valeur"
                    />
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-alert hover:bg-alert/10"
                    onClick={() =>
                      setConditions((prev) => prev.filter((c) => c.key !== condition.key))
                    }
                    aria-label="Retirer la condition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              <p className="text-xs text-slate">
                Champs disponibles selon le déclencheur : <code>amount</code>,{" "}
                <code>stageName</code>, <code>probability</code>, <code>customerId</code>,{" "}
                <code>total</code>, <code>customerName</code>.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink">Actions</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setActions((prev) => [
                  ...prev,
                  { key: newKey(), type: "NOTIFY_USER", config: { userId: "owner" } },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>

          <div className="space-y-3">
            {actions.map((action, index) => (
              <div key={action.key} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate">{index + 1}.</span>

                  <Select
                    value={action.type}
                    onChange={(e) => updateAction(action.key, { type: e.target.value, config: {} })}
                    className="max-w-[220px]"
                    aria-label="Type d'action"
                  >
                    {Object.entries(ACTION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-alert hover:bg-alert/10"
                    disabled={actions.length === 1}
                    onClick={() => setActions((prev) => prev.filter((a) => a.key !== action.key))}
                    aria-label="Retirer l'action"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {action.type === "NOTIFY_ROLE" && (
                    <Field label="Rôle destinataire" htmlFor={`a-role-${action.key}`}>
                      <Select
                        id={`a-role-${action.key}`}
                        value={action.config.roleName ?? ""}
                        onChange={(e) => updateConfig(action.key, "roleName", e.target.value)}
                      >
                        <option value="SUPER_ADMIN">Super administrateur</option>
                        <option value="ADMIN_VENTES">Admin ventes</option>
                        <option value="SUPERVISEUR">Superviseur</option>
                        <option value="MANAGER">Financier</option>
                        <option value="COMMERCIAL">Commercial</option>
                      </Select>
                    </Field>
                  )}

                  {action.type === "NOTIFY_USER" && (
                    <Field
                      label="Destinataire"
                      htmlFor={`a-user-${action.key}`}
                      hint="« owner » désigne le responsable de la fiche."
                    >
                      <Input
                        id={`a-user-${action.key}`}
                        value={action.config.userId ?? "owner"}
                        onChange={(e) => updateConfig(action.key, "userId", e.target.value)}
                      />
                    </Field>
                  )}

                  {action.type === "SEND_EMAIL" && (
                    <Field label="Adresse" htmlFor={`a-to-${action.key}`}>
                      <Input
                        id={`a-to-${action.key}`}
                        value={action.config.to ?? ""}
                        onChange={(e) => updateConfig(action.key, "to", e.target.value)}
                        placeholder="{{customerEmail}}"
                      />
                    </Field>
                  )}

                  {action.type === "CALL_WEBHOOK" && (
                    <Field label="URL (HTTPS)" htmlFor={`a-url-${action.key}`}>
                      <Input
                        id={`a-url-${action.key}`}
                        value={action.config.url ?? ""}
                        onChange={(e) => updateConfig(action.key, "url", e.target.value)}
                        placeholder="https://…"
                      />
                    </Field>
                  )}

                  {action.type === "CREATE_ACTIVITY" && (
                    <Field label="Échéance (jours)" htmlFor={`a-due-${action.key}`}>
                      <Input
                        id={`a-due-${action.key}`}
                        type="number"
                        min={0}
                        value={action.config.dueInDays ?? "1"}
                        onChange={(e) => updateConfig(action.key, "dueInDays", e.target.value)}
                      />
                    </Field>
                  )}

                  <Field label="Titre" htmlFor={`a-title-${action.key}`}>
                    <Input
                      id={`a-title-${action.key}`}
                      value={action.config.title ?? ""}
                      onChange={(e) => updateConfig(action.key, "title", e.target.value)}
                      placeholder="Affaire à suivre"
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field
                      label="Message"
                      htmlFor={`a-msg-${action.key}`}
                      hint="Variables : {{title}}, {{amount}}, {{customerName}}, {{stageName}}."
                    >
                      <Textarea
                        id={`a-msg-${action.key}`}
                        rows={2}
                        value={action.config.message ?? ""}
                        onChange={(e) => updateConfig(action.key, "message", e.target.value)}
                        placeholder="{{title}} ({{amount}} FCFA) est passée en {{stageName}}."
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer la règle
          </Button>
        </div>
      </div>
    </Modal>
  );
}

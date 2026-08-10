import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/Field";

import { usersService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { QK, roleLabel } from "@/config/constants";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

interface Props {
  open: boolean;
  onClose: () => void;
  user: Row | null;
  roles: Row[];
}

export function UserFormModal({ open, onClose, user, roles }: Props) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentRole = useAuthStore((s) => s.user?.role?.name);

  // Seul le Super Admin atteint cet écran : tous les rôles lui sont ouverts.
  const assignableRoles = currentRole === "SUPER_ADMIN" ? roles : [];
  const isEdit = Boolean(user);
  const isSelf = isEdit && String(user?.id) === currentUserId;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [roleId, setRoleId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;

    setFirstName(String(user?.firstName ?? ""));
    setLastName(String(user?.lastName ?? ""));
    setEmail(String(user?.email ?? ""));
    setPhone(String(user?.phone ?? ""));
    setJobTitle(String(user?.jobTitle ?? ""));
    setRoleId(String(user?.roleId ?? (user?.role as Row)?.id ?? ""));
    setPassword("");
    setShowPassword(false);
  }, [open, user]);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        roleId,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(jobTitle.trim() ? { jobTitle: jobTitle.trim() } : {}),
      };

      // À la création le mot de passe est obligatoire ; en modification il
      // n'est transmis que si l'administrateur en saisit un nouveau.
      if (password) body.password = password;

      // Le serveur refuse qu'on modifie son propre rôle : on ne l'envoie
      // même pas, pour éviter un 400 sur une modification par ailleurs valide.
      if (isSelf) delete body.roleId;

      return isEdit
        ? usersService.update(String(user!.id), body)
        : usersService.create(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Compte mis à jour" : "Compte créé");
      queryClient.invalidateQueries({ queryKey: QK.users });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const fieldError = (name: string) => (save.error as ApiError | null)?.fieldErrors?.[name];

  const canSubmit =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    email.trim().includes("@") &&
    (isSelf || Boolean(roleId)) &&
    (isEdit || password.length >= 8);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Modifier le compte" : "Nouveau compte"}
      description={
        isEdit
          ? "Laissez le mot de passe vide pour le conserver inchangé."
          : "L'agent se connectera avec cette adresse et ce mot de passe."
      }
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" htmlFor="u-first" required error={fieldError("firstName")}>
            <Input
              id="u-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Nom" htmlFor="u-last" required error={fieldError("lastName")}>
            <Input id="u-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>

          <Field label="E-mail" htmlFor="u-email" required error={fieldError("email")}>
            <Input
              id="u-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@makor.ci"
            />
          </Field>

          <Field label="Téléphone" htmlFor="u-phone" error={fieldError("phone")}>
            <Input
              id="u-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07 00 00 00 00"
            />
          </Field>

          <Field
            label="Rôle"
            htmlFor="u-role"
            required={!isSelf}
            error={fieldError("roleId")}
            hint={isSelf ? "Vous ne pouvez pas modifier votre propre rôle." : undefined}
          >
            <Select
              id="u-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={isSelf}
            >
              <option value="">Choisir un rôle</option>
              {assignableRoles.map((entry) => (
                <option key={String(entry.id)} value={String(entry.id)}>
                  {roleLabel(entry as { name?: string; label?: string })}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Fonction" htmlFor="u-job" error={fieldError("jobTitle")}>
            <Input
              id="u-job"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Chargé de clientèle"
            />
          </Field>
        </div>

        <Field
          label={isEdit ? "Nouveau mot de passe" : "Mot de passe"}
          htmlFor="u-password"
          required={!isEdit}
          error={fieldError("password")}
          hint="8 caractères minimum."
        >
          <div className="relative">
            <Input
              id="u-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={isEdit ? "Inchangé" : "••••••••"}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-ink"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {save.error && !(save.error as ApiError).fieldErrors && (
          <p role="alert" className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">
            {(save.error as ApiError).message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !canSubmit}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer le compte"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

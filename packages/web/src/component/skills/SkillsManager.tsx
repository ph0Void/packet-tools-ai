"use client";

import { useActionState, useState } from "react";
import {
  BookOpen,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import {
  createSkillAction,
  deleteSkillAction,
  toggleSkillAction,
  updateSkillAction,
  type FormSkillState,
} from "@/action/SkillAction";
import type { Skill } from "@/service/SkillService";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface SkillsManagerProps {
  initialSkills: Skill[];
  canEdit: boolean;
  canDelete: boolean;
}

const ESTADO_INICIAL: FormSkillState<Skill> = { success: false, message: "" };

export default function SkillsManager({
  initialSkills,
  canEdit,
  canDelete,
}: SkillsManagerProps) {
  const t = useT();
  const skills = initialSkills;

  const [formId, setFormId] = useState<string | null | undefined>(undefined);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [alternando, setAlternando] = useState<string | null>(null);

  const [creando, guardarNueva, creandoPendiente] = useActionState(
    async (prev: FormSkillState<Skill>, formData: FormData) => {
      const res = await createSkillAction(prev, formData);
      if (res.success) {
        toast.success(res.message);
        playSound("create");
        setFormId(undefined);
      } else {
        notifyError(res.message || t.skills.toasts.createFailed);
      }
      return res;
    },
    ESTADO_INICIAL,
  );

  const [actualizando, guardarCambios, actualizandoPendiente] = useActionState(
    async (prev: FormSkillState<Skill>, formData: FormData) => {
      const res = await updateSkillAction(prev, formData);
      if (res.success) {
        toast.success(res.message);
        playSound("update");
        setFormId(undefined);
      } else {
        notifyError(res.message || t.skills.toasts.updateFailed);
      }
      return res;
    },
    ESTADO_INICIAL,
  );

  // OJO: el tercer elemento de `useActionState` es `isPending`. Los dos primeros son
  // [estado, acción] y el estado es SIEMPRE un objeto truthy: usarlo como bandera de
  // "guardando" deja el botón deshabilitado para siempre y ninguna skill se puede
  // crear ni editar desde el panel.
  const guardando = creandoPendiente || actualizandoPendiente;
  const formularioAbierto = formId !== undefined;
  const skillEnEdicion = formId
    ? skills.find((s) => s.id === formId)
    : undefined;

  // El estado de la acción se usa para pintar el error bajo el formulario: el toast
  // desaparece y esto deja claro por qué no se guardó (título vacío, contenido vacío,
  // slug duplicado...). Al abrir el formulario en modo creación se muestra `creando` y en
  // modo edición `actualizando`.
  const estadoDelFormulario = formularioAbierto
    ? formId
      ? actualizando
      : creando
    : null;
  const errorDelFormulario =
    estadoDelFormulario &&
    estadoDelFormulario.success === false &&
    estadoDelFormulario.message
      ? estadoDelFormulario.message
      : "";

  const eliminar = async (skill: Skill) => {
    const confirmado = window.confirm(
      interp(t.skills.toasts.deleteConfirm, { title: skill.title }),
    );
    if (!confirmado) return;

    setBorrando(skill.id);
    try {
      const res = await deleteSkillAction(skill.id);
      if (res.success) toast.success(res.message);
      else notifyError(res.message || t.skills.toasts.deleteFailed);
    } finally {
      setBorrando(null);
    }
  };

  const alternar = async (skill: Skill) => {
    setAlternando(skill.id);
    try {
      const res = await toggleSkillAction(skill.id, !skill.enabled);
      if (res.success) {
        toast.success(res.message);
        playSound("update");
      } else notifyError(res.message || t.skills.toasts.toggleFailed);
    } finally {
      setAlternando(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/40 bg-muted/30 p-4 md:p-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpen className="h-5 w-5 text-primary" />
            {t.skills.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t.skills.subtitlePrefix}{" "}
            <code className="font-mono text-xs">@skill:&lt;id&gt;</code>
            {t.skills.subtitleSuffix}
          </p>
        </div>

        {canEdit && !formularioAbierto && (
          <Button
            onClick={() => setFormId(null)}
            className="gap-2 self-start sm:self-auto shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t.skills.new}
          </Button>
        )}
      </div>

      {formularioAbierto && (
        <form
          action={formId ? guardarCambios : guardarNueva}
          className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {formId ? t.skills.form.editTitle : t.skills.form.createTitle}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setFormId(undefined)}
              className="cursor-pointer"
              aria-label={t.skills.actions.close}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <input type="hidden" name="id" value={formId ?? ""} />

          {errorDelFormulario && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorDelFormulario}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="skill-title"
                className="text-xs font-medium text-muted-foreground"
              >
                {t.skills.form.titleLabel}
              </label>
              <Input
                id="skill-title"
                name="title"
                defaultValue={skillEnEdicion?.title ?? ""}
                key={`titulo-${formId ?? "nueva"}`}
                placeholder={t.skills.form.titlePlaceholder}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="skill-description"
                className="text-xs font-medium text-muted-foreground"
              >
                {t.skills.form.whenToUse}
              </label>
              <Input
                id="skill-description"
                name="description"
                defaultValue={skillEnEdicion?.description ?? ""}
                key={`descripcion-${formId ?? "nueva"}`}
                placeholder={t.skills.form.whenToUsePlaceholder}
                className="text-sm"
              />
            </div>
          </div>

          {formId && (
            <p className="text-[11px] text-muted-foreground">
              {t.skills.form.identifier}{" "}
              <code className="font-mono">{skillEnEdicion?.slug}</code>.{" "}
              {t.skills.form.identifierHintStart}{" "}
              <code className="font-mono">@skill:</code>{" "}
              {t.skills.form.identifierHintEnd}
            </p>
          )}

          <div className="space-y-1">
            <label
              htmlFor="skill-content"
              className="text-xs font-medium text-muted-foreground"
            >
              {t.skills.form.content}
            </label>
            <Textarea
              id="skill-content"
              name="content"
              defaultValue={
                skillEnEdicion?.content ?? t.skills.form.contentTemplate
              }
              key={`contenido-${formId ?? "nueva"}`}
              rows={14}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              {t.skills.form.contentHint}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormId(undefined)}
              className="cursor-pointer"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={guardando}
              className="cursor-pointer"
            >
              <Save className="size-3.5" />
              {formId ? t.skills.form.saveChanges : t.skills.form.create}
            </Button>
          </div>
        </form>
      )}

      {skills.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
          <BookOpen className="mx-auto mb-2 size-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {t.skills.empty.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            {t.skills.empty.hint}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {skills.map((skill) => (
            <li
              key={skill.id}
              className="rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {skill.title}
                    </span>
                    <Badge
                      variant="outline"
                      className="gap-1 font-mono text-[10px]"
                    >
                      <Sparkles className="size-2.5" />@{skill.slug}
                    </Badge>
                    {!skill.enabled && (
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px]"
                      >
                        {t.skills.form.disabled}
                      </Badge>
                    )}
                  </div>
                  {skill.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {skill.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {canEdit && (
                    <Switch
                      checked={skill.enabled}
                      disabled={alternando === skill.id}
                      onCheckedChange={() => alternar(skill)}
                      aria-label={
                        skill.enabled
                          ? interp(t.skills.actions.disable, {
                              title: skill.title,
                            })
                          : interp(t.skills.actions.enable, {
                              title: skill.title,
                            })
                      }
                    />
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setFormId(skill.id)}
                      className="cursor-pointer"
                      aria-label={interp(t.skills.actions.edit, {
                        title: skill.title,
                      })}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={borrando === skill.id}
                      onClick={() => eliminar(skill)}
                      className="cursor-pointer text-red-500 hover:text-red-600"
                      aria-label={interp(t.skills.actions.delete, {
                        title: skill.title,
                      })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

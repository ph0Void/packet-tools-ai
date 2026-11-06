"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/FormatDate";
import type { CronJob, CronJobRunResult } from "@/service/CronJobService";
import {
  getJobScheduler,
  type InstantaneaPlanificador,
} from "@/service/JobSchedulerService";
import { runJobAction } from "@/action/CronJobAction";
import {
  comandosATexto,
  extraerComandos,
  MAX_COMANDOS_STANDARD,
  motivoDispositivoNoSoportado,
} from "@/component/jobs/comandosStandard";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  Clock,
  Edit2,
  FileText,
  Play,
  Plus,
  Server,
  Sparkles,
  Terminal,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useT, useLocale } from "@/hooks/useT";
import { interp } from "@/i18n/interp";
import type { Dictionary } from "@/i18n";

export type CronJobRow = CronJob & {
  lastRun?: string | null;
  nextRun?: string | null;
  status?: string | null;
};

type DispositivoOpcional = {
  id: string;
  name: string;
  protocol: string;
  typeDevice: string;
};

interface CronJobManagerProps {
  initialJobs: CronJobRow[];
  topologies: { id: string; name: string }[];
  devices: DispositivoOpcional[];
  canManage: boolean;
}

type ActionType = "STANDARD" | "INTELLIGENT";

interface JobFormState {
  id?: string;
  name: string;
  description: string;
  prompt: string;
  actionType: ActionType;
  scheduledDate: Date | undefined;
  scheduledTime: string;
  deviceProviderId: string;
  topologyId: string;
  isActive: boolean;

  commands: string;
}

const NONE = "__none__";

const EMPTY_FORM: JobFormState = {
  name: "",
  description: "",
  prompt: "",
  actionType: "INTELLIGENT",
  scheduledDate: undefined,
  scheduledTime: "02:00",
  deviceProviderId: "",
  topologyId: "",
  isActive: true,
  commands: "",
};

const ACTION_OPTIONS: {
  value: ActionType;
  icon: LucideIcon;
  accent: string;
}[] = [
    {
      value: "INTELLIGENT",
      icon: Sparkles,
      accent: "text-violet-400",
    },
    {
      value: "STANDARD",
      icon: Terminal,
      accent: "text-blue-400",
    },
  ];

const pad = (value: number) => String(value).padStart(2, "0");

function toTimeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function combineDateTime(date: Date | undefined, time: string): Date | null {
  if (!date) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-amber-500/30 bg-amber-500/15 text-amber-500",
  RUNNING: "border-cyan-500/30 bg-cyan-500/15 text-cyan-400",
  SUCCESS: "border-emerald-500/30 bg-emerald-500/15 text-emerald-500",
  FAILED: "border-red-500/30 bg-red-500/15 text-red-500",
  CANCEL: "border-border bg-muted text-muted-foreground",
};

function toJobPayload(
  form: JobFormState,
  includeScheduledAt: boolean,
): Record<string, unknown> {
  const scheduledAt = combineDateTime(form.scheduledDate, form.scheduledTime);
  const commands =
    form.actionType === "STANDARD" ? extraerComandos(form.commands) : [];
  return {
    name: form.name.trim(),
    actionType: form.actionType,
    isActive: form.isActive,
    ...(includeScheduledAt && scheduledAt
      ? { scheduledAt: scheduledAt.toISOString() }
      : {}),
    ...(form.description.trim()
      ? { description: form.description.trim() }
      : {}),
    ...(form.prompt.trim() ? { prompt: form.prompt.trim() } : {}),
    ...(commands.length > 0 ? { config: { commands } } : {}),
    ...(form.deviceProviderId
      ? { deviceProviderId: form.deviceProviderId }
      : {}),
    ...(form.topologyId ? { topologyId: form.topologyId } : {}),
  };
}

function textoResultadoEjecucion(
  resultado: CronJobRunResult | undefined,
  t: Dictionary,
): { ok: boolean; texto: string } {
  if (!resultado) {
    return { ok: false, texto: t.jobs.toasts.noResult };
  }
  if (resultado.ok) {
    return {
      ok: true,
      texto: interp(t.jobs.toasts.runDone, {
        name: resultado.nombre,
        ms: resultado.duracionMs,
      }),
    };
  }
  if (!resultado.ejecutado && resultado.error) {
    return { ok: false, texto: resultado.error };
  }
  return {
    ok: false,
    texto: resultado.error
      ? interp(t.jobs.toasts.runFailedDetail, { error: resultado.error })
      : interp(t.jobs.toasts.runFinishedError, {
          name: resultado.nombre,
        }),
  };
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-b border-border/60 pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-7 text-foreground">
            {title}
          </h3>
          {description && (
            <p className="-mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

const ALERT_TONES = {
  info: "border-border bg-muted/60 text-muted-foreground",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
} as const;

function InlineAlert({
  tone,
  icon: Icon = TriangleAlert,
  children,
}: {
  tone: keyof typeof ALERT_TONES;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-xs",
        ALERT_TONES[tone],
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function CronJobManager({
  initialJobs,
  devices,
  canManage,
}: CronJobManagerProps) {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "es-ES";
  const router = useRouter();
  const [jobs, setJobs] = useState<CronJobRow[]>(initialJobs);
  const [prevInitialJobs, setPrevInitialJobs] =
    useState<CronJobRow[]>(initialJobs);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CronJobRow | null>(null);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [planificador, setPlanificador] = useState<
    InstantaneaPlanificador[] | null
  >(null);

  if (prevInitialJobs !== initialJobs) {
    setPrevInitialJobs(initialJobs);
    setJobs(initialJobs);
  }

  useEffect(() => {
    if (!canManage) return;
    let vivo = true;
    void getJobScheduler().then((res) => {
      if (vivo && res.success && res.data) setPlanificador(res.data);
    });
    return () => {
      vivo = false;
    };
  }, [canManage, initialJobs]);

  const automatizadasEnCurso = (planificador ?? []).filter(
    (fila) => fila.enEjecucion,
  ).length;

  const scheduledAt = combineDateTime(form.scheduledDate, form.scheduledTime);
  const isScheduledInPast = scheduledAt
    ? scheduledAt.getTime() <= now.getTime()
    : false;
  const today = now;
  const editingJob = form.id
    ? jobs.find((job) => job.id === form.id)
    : undefined;
  const originalScheduledAt = editingJob?.scheduledAt
    ? new Date(editingJob.scheduledAt).getTime()
    : null;
  const scheduledAtUnchanged =
    originalScheduledAt !== null &&
    scheduledAt?.getTime() === originalScheduledAt;
  const legacyCron =
    editingJob && !editingJob.scheduledAt ? editingJob.cronExpression : null;

  const esStandard = form.actionType === "STANDARD";
  const comandosFormulario = esStandard ? extraerComandos(form.commands) : [];
  const dispositivoElegido = devices.find(
    (d) => d.id === form.deviceProviderId,
  );

  const avisoDispositivo =
    esStandard && dispositivoElegido
      ? motivoDispositivoNoSoportado(dispositivoElegido)
      : null;

  const updateForm = (patch: Partial<JobFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const changeActionType = (actionType: ActionType) =>
    updateForm({
      actionType,
      ...(actionType === "INTELLIGENT" ? { commands: "" } : {}),
    });

  const openCreateDialog = () => {
    setNow(new Date());
    setForm(EMPTY_FORM);
    setIsDateOpen(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (job: CronJobRow) => {
    const scheduled = job.scheduledAt ? new Date(job.scheduledAt) : null;
    const validScheduled =
      scheduled && !isNaN(scheduled.getTime()) ? scheduled : null;
    setForm({
      id: job.id,
      name: job.name,
      description: job.description ?? "",
      prompt: job.prompt ?? "",
      actionType: job.actionType,
      scheduledDate: validScheduled ?? undefined,
      scheduledTime: validScheduled ? toTimeValue(validScheduled) : "02:00",
      deviceProviderId: job.deviceProviderId ?? "",
      topologyId: job.topologyId ?? "",
      isActive: job.isActive,

      commands: comandosATexto(extraerComandos(job.payload)),
    });
    setNow(new Date());
    setIsDateOpen(false);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const name = form.name.trim();

    if (!name) {
      notifyError(t.jobs.toasts.nameRequired);
      return;
    }
    if (!form.id && !scheduledAt) {
      notifyError(t.jobs.toasts.selectDateTime);
      return;
    }
    if (form.scheduledDate && !scheduledAt) {
      notifyError(t.jobs.toasts.invalidTime);
      return;
    }
    const isPastSchedule = Boolean(
      scheduledAt && scheduledAt.getTime() <= new Date().getTime(),
    );
    if (isPastSchedule && !scheduledAtUnchanged) {
      notifyError(t.jobs.toasts.futureDate);
      return;
    }
    if (
      isPastSchedule &&
      scheduledAtUnchanged &&
      form.isActive &&
      !editingJob?.isActive
    ) {
      notifyError(t.jobs.toasts.expiredReactivate);
      return;
    }

    if (form.actionType === "STANDARD") {
      if (comandosFormulario.length === 0) {
        notifyError(t.jobs.toasts.commandsRequired);
        return;
      }
      if (comandosFormulario.length > MAX_COMANDOS_STANDARD) {
        notifyError(
          interp(t.jobs.toasts.commandsMax, {
            max: MAX_COMANDOS_STANDARD,
            count: comandosFormulario.length,
          }),
        );
        return;
      }
      if (!form.deviceProviderId) {
        notifyError(t.jobs.toasts.deviceRequired);
        return;
      }
    }
    const includeScheduledAt = Boolean(scheduledAt) && !scheduledAtUnchanged;

    setBusyId(form.id ?? "new");
    try {
      const res = await fetch(form.id ? `/api/jobs/${form.id}` : "/api/jobs", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toJobPayload(form, includeScheduledAt)),
      });
      const data: {
        success: boolean;
        message: string;
        data: CronJobRow | null;
      } = await res.json();

      if (!data.success || !data.data) {
        notifyError(data.message || t.jobs.toasts.saveError);
        return;
      }

      toast.success(
        form.id ? t.jobs.toasts.updated : t.jobs.toasts.created,
      );
      playSound(form.id ? "update" : "create");
      setIsDialogOpen(false);

      const saved = data.data as CronJobRow;
      setJobs((prev) =>
        form.id
          ? prev.map((j) => (j.id === saved.id ? saved : j))
          : [saved, ...prev],
      );
      router.refresh();
    } catch {
      notifyError(t.jobs.toasts.saveError);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (job: CronJobRow, active: boolean) => {
    const expiredOneTime =
      active &&
      job.scheduledAt &&
      new Date(job.scheduledAt).getTime() <= new Date().getTime();
    if (expiredOneTime) {
      notifyError(t.jobs.toasts.expiredOneTime);
      return;
    }
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, isActive: active } : j)),
    );
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: job.name,
          actionType: job.actionType,
          isActive: active,
          ...(active && job.scheduledAt
            ? { scheduledAt: job.scheduledAt }
            : {}),
          ...(job.description ? { description: job.description } : {}),
          ...(job.prompt ? { prompt: job.prompt } : {}),
          ...(job.deviceProviderId
            ? { deviceProviderId: job.deviceProviderId }
            : {}),
          ...(job.topologyId ? { topologyId: job.topologyId } : {}),
        }),
      });
      const data: { success: boolean; message: string } = await res.json();
      if (!data.success) {
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, isActive: !active } : j)),
        );
        notifyError(data.message || t.jobs.toasts.statusError);
        return;
      }
      toast.success(
        active ? t.jobs.toasts.activated : t.jobs.toasts.deactivated,
      );
      playSound("update");
      router.refresh();
    } catch {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, isActive: !active } : j)),
      );
      notifyError(t.jobs.toasts.statusUpdateError);
    }
  };

  const handleRun = async (id: string) => {
    setBusyId(id);
    try {
      const result = await runJobAction(id);
      const ejecucion = result.data;
      if (!result.success) {

        notifyError(result.message || t.jobs.toasts.runError);
        router.refresh();
        return;
      }

      const pintado = textoResultadoEjecucion(ejecucion, t);
      if (pintado.ok) {
        toast.success(pintado.texto);
      } else {
        notifyError(pintado.texto);
      }

      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? {
              ...j,
              status: ejecucion?.status ?? j.status,
              isActive:
                typeof ejecucion?.isActive === "boolean"
                  ? ejecucion.isActive
                  : j.isActive,
              nextRun: ejecucion?.nextRun ?? null,
              lastRun: new Date().toISOString(),
            }
            : j,
        ),
      );
      router.refresh();
    } catch {
      notifyError(t.jobs.toasts.runFailed);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await fetch(`/api/jobs/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data: { success: boolean; message: string } = await res.json();
      if (!data.success) {
        notifyError(data.message || t.jobs.toasts.deleteError);
        return;
      }
      toast.success(t.jobs.toasts.deleted);
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      router.refresh();
    } catch {
      notifyError(t.jobs.toasts.deleteUnexpected);
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const isSaving = busyId === (form.id ?? "new");

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/40 bg-muted/30 p-4 md:p-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Clock className="h-5 w-5 text-primary" />
            {t.jobs.header.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t.jobs.header.description}{" "}
          </p>

          {planificador && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                {planificador.length === 1
                  ? interp(t.jobs.header.scheduledOne, {
                      count: planificador.length,
                    })
                  : interp(t.jobs.header.scheduledMany, {
                      count: planificador.length,
                    })}
              </span>
              {automatizadasEnCurso > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-cyan-400">
                    {interp(t.jobs.header.running, {
                      count: automatizadasEnCurso,
                    })}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {canManage && (
          <Button
            onClick={openCreateDialog}
            className="cursor-pointer gap-2 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t.jobs.header.newJob}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="p-4">{t.jobs.table.name}</th>
                <th className="p-4">{t.jobs.table.type}</th>
                <th className="p-4">{t.jobs.table.target}</th>
                <th className="p-4">{t.jobs.table.schedule}</th>
                <th className="p-4">{t.jobs.table.nextRun}</th>
                <th className="p-4">{t.jobs.table.lastRun}</th>
                <th className="p-4">{t.jobs.table.status}</th>
                <th className="p-4 text-center">{t.jobs.table.active}</th>
                {canManage && <th className="p-4 text-right">{t.jobs.table.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 9 : 8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {t.jobs.table.empty}
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const statusStyle =
                    STATUS_STYLES[job.status ?? ""] ?? STATUS_STYLES.CANCEL;
                  const enEjecucion =
                    planificador?.find((fila) => fila.id === job.id)
                      ?.enEjecucion ?? false;
                  return (
                    <tr
                      key={job.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="p-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          {job.actionType === "INTELLIGENT" ? (
                            <Sparkles className="h-4 w-4 text-violet-400" />
                          ) : (
                            <Terminal className="h-4 w-4 text-blue-400" />
                          )}
                          <span>{job.name}</span>
                        </div>
                        {job.description && (
                          <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                            {job.description}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            job.actionType === "INTELLIGENT"
                              ? "border-violet-500/30 bg-violet-500/15 text-violet-400"
                              : "border-blue-500/30 bg-blue-500/15 text-blue-400",
                          )}
                        >
                          {job.actionType}
                        </Badge>
                      </td>
                      <td className="max-w-40 truncate p-4 text-xs text-muted-foreground">
                        {job.deviceProvider?.name ?? "—"}
                        <br />
                        {job.topology?.name ?? t.jobs.table.noTopology}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {job.scheduledAt ? (
                            <span className="text-xs whitespace-nowrap text-muted-foreground">
                              {formatDate(job.scheduledAt, dateLocale)}
                            </span>
                          ) : (
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                              {job.cronExpression}
                            </code>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              job.scheduledAt
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border bg-muted text-muted-foreground",
                            )}
                          >
                            {job.scheduledAt ? t.jobs.table.once : t.jobs.table.recurring}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 text-xs whitespace-nowrap text-muted-foreground">
                        {job.nextRun ? formatDate(job.nextRun, dateLocale) : "—"}
                      </td>
                      <td className="p-4 text-xs whitespace-nowrap text-muted-foreground">
                        {job.lastRun ? formatDate(job.lastRun, dateLocale) : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={statusStyle}>
                            {job.status ?? "PENDING"}
                          </Badge>

                          {enEjecucion && (
                            <Badge
                              variant="outline"
                              className="gap-1 border-cyan-500/30 bg-cyan-500/15 text-cyan-400"
                            >
                              <Spinner className="h-3 w-3" />
                              {t.jobs.table.running}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Switch
                          className="cursor-pointer"
                          checked={job.isActive}
                          disabled={!canManage || busyId === job.id}
                          onCheckedChange={(checked) =>
                            handleToggleActive(job, checked)
                          }
                          aria-label={interp(t.jobs.row.activateAria, {
                            name: job.name,
                          })}
                        />
                      </td>
                      {canManage && (
                        <td className="p-4 text-right">
                          <div className="inline-flex justify-end space-x-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="cursor-pointer"
                              title={
                                busyId === job.id
                                  ? t.jobs.row.running
                                  : t.jobs.row.runNow
                              }
                              aria-busy={busyId === job.id}
                              disabled={busyId === job.id}
                              onClick={() => handleRun(job.id)}
                            >
                              {busyId === job.id ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="cursor-pointer"
                              title={t.jobs.row.edit}
                              disabled={busyId === job.id}
                              onClick={() => openEditDialog(job)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="cursor-pointer text-destructive hover:bg-destructive/10"
                              title={t.jobs.row.delete}
                              disabled={busyId === job.id}
                              onClick={() => setDeleteTarget(job)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border px-6 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              {form.id ? t.jobs.dialog.editTitle : t.jobs.dialog.createTitle}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {t.jobs.dialog.subtitle}
            </p>
          </DialogHeader>

          <form
            onSubmit={handleSave}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-6 py-5">

              <FormSection icon={FileText} title={t.jobs.dialog.general}>
                <div className="grid gap-4 ">
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="job-name">{t.jobs.dialog.nameLabel}</Label>
                    <Input
                      id="job-name"
                      placeholder={t.jobs.dialog.namePlaceholder}
                      value={form.name}
                      onChange={(e) => updateForm({ name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="job-description">
                      {t.jobs.dialog.descriptionLabel}
                    </Label>
                    <Textarea
                      id="job-description"
                      className="resize-none min-h-[60px]"
                      placeholder={t.jobs.dialog.descriptionPlaceholder}
                      value={form.description}
                      onChange={(e) =>
                        updateForm({ description: e.target.value })
                      }
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                icon={Sparkles}
                title={t.jobs.dialog.actionType}
                description={t.jobs.dialog.actionTypeHint}
              >
                <div
                  role="radiogroup"
                  aria-label={t.jobs.dialog.actionTypeAria}
                  className="grid gap-3 md:grid-cols-2"
                >
                  {ACTION_OPTIONS.map((option) => {
                    const selected = form.actionType === option.value;
                    const Icon = option.icon;
                    const optionText =
                      option.value === "INTELLIGENT"
                        ? t.jobs.actionTypes.intelligent
                        : t.jobs.actionTypes.standard;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => changeActionType(option.value)}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <Icon
                          className={cn("mt-0.5 h-4 w-4 shrink-0", option.accent)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">
                            {optionText.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {optionText.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FormSection>

              <FormSection
                icon={CalendarClock}
                title={t.jobs.dialog.schedule}
                description={t.jobs.dialog.scheduleHint}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="min-w-0 space-y-2">
                    <Label id="job-date-label">{t.jobs.dialog.dateLabel}</Label>
                    <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full cursor-pointer justify-start gap-2 font-normal"
                          aria-labelledby="job-date-label"
                        >
                          <CalendarIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {form.scheduledDate
                              ? formatDate(form.scheduledDate, dateLocale, {
                                dateStyle: "long",
                              })
                              : t.jobs.dialog.selectDate}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={form.scheduledDate}
                          onSelect={(date) => {
                            updateForm({ scheduledDate: date });
                            setIsDateOpen(false);
                          }}
                          disabled={{ before: today }}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="job-time">{t.jobs.dialog.timeLabel}</Label>
                    <Input
                      id="job-time"
                      type="time"
                      className="cursor-pointer"
                      value={form.scheduledTime}
                      onChange={(e) =>
                        updateForm({ scheduledTime: e.target.value })
                      }
                    />
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="job-active" className="cursor-pointer">
                      {t.jobs.dialog.statusLabel}
                    </Label>
                    <div className="flex h-9 items-center justify-between gap-3 rounded-md border border-border px-3">
                      <Label
                        htmlFor="job-active"
                        className="cursor-pointer text-sm font-normal"
                      >
                        {t.jobs.dialog.activeTask}
                      </Label>
                      <Switch

                        className="cursor-pointer"
                        checked={form.isActive}
                        onCheckedChange={(checked) =>
                          updateForm({ isActive: checked })
                        }
                        aria-label={t.jobs.dialog.activeAria}
                      />
                    </div>
                  </div>
                </div>

                {scheduledAt && !isScheduledInPast && (
                  <InlineAlert tone="info" icon={CalendarIcon}>
                    {interp(t.jobs.dialog.willRunOnce, {
                      date: formatDate(scheduledAt, dateLocale, {
                        dateStyle: "full",
                        timeStyle: "short",
                      }),
                    })}
                  </InlineAlert>
                )}

                {isScheduledInPast && scheduledAtUnchanged && (
                  <InlineAlert tone="warning" icon={CalendarIcon}>
                    {t.jobs.dialog.expiredKept}
                  </InlineAlert>
                )}

                {isScheduledInPast && !scheduledAtUnchanged && (
                  <InlineAlert tone="danger" icon={CalendarIcon}>
                    {t.jobs.dialog.mustBeFuture}
                  </InlineAlert>
                )}

                {legacyCron && !form.scheduledDate && (
                  <InlineAlert tone="info" icon={CalendarIcon}>
                    {interp(t.jobs.dialog.legacyCron, { cron: legacyCron })}
                  </InlineAlert>
                )}
              </FormSection>

              <FormSection
                icon={Server}
                title={t.jobs.dialog.target}
                description={t.jobs.dialog.targetHint}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <Label>
                      {esStandard
                        ? t.jobs.dialog.deviceRequired
                        : t.jobs.dialog.device}
                    </Label>
                    <Select
                      value={form.deviceProviderId || NONE}
                      onValueChange={(val) =>
                        updateForm({
                          deviceProviderId: val === NONE ? "" : val,
                        })
                      }
                    >
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue
                          placeholder={
                            esStandard
                              ? t.jobs.dialog.devicePlaceholderRequired
                              : t.jobs.dialog.devicePlaceholderOptional
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE} className="cursor-pointer">
                          {t.jobs.dialog.noDevice}
                        </SelectItem>
                        {devices.map((d) => (
                          <SelectItem
                            key={d.id}
                            value={d.id}
                            className="cursor-pointer"
                          >
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                {avisoDispositivo && (
                  <InlineAlert tone="danger">{avisoDispositivo}</InlineAlert>
                )}
              </FormSection>

              {esStandard ? (
                <FormSection
                  icon={Terminal}
                  title={t.jobs.dialog.commands}
                  description={t.jobs.dialog.commandsHint}
                >
                  <div className="space-y-2">
                    <Textarea
                      id="job-commands"
                      rows={7}
                      spellCheck={false}
                      className="font-mono text-sm min-h-[130px] "
                      placeholder={
                        "show version\nshow ip interface brief\nshow clock"
                      }
                      value={form.commands}
                      onChange={(e) =>
                        updateForm({ commands: e.target.value })
                      }
                      aria-label={t.jobs.dialog.commandsAria}
                      aria-describedby="job-commands-help"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <p
                        id="job-commands-help"
                        className="min-w-0 flex-1 text-muted-foreground"
                      >
                        {interp(t.jobs.dialog.commandsHelp, {
                          date: scheduledAt
                            ? formatDate(scheduledAt, dateLocale, {
                              dateStyle: "long",
                              timeStyle: "short",
                            })
                            : t.jobs.dialog.commandsHelpFallback,
                        })}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          comandosFormulario.length > MAX_COMANDOS_STANDARD
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {interp(t.jobs.dialog.commandsCount, {
                          count: comandosFormulario.length,
                          max: MAX_COMANDOS_STANDARD,
                        })}
                      </span>
                    </div>

                    {comandosFormulario.length > MAX_COMANDOS_STANDARD && (
                      <InlineAlert tone="danger">
                        {interp(t.jobs.dialog.commandsOver, {
                          count: comandosFormulario.length,
                          max: MAX_COMANDOS_STANDARD,
                        })}
                      </InlineAlert>
                    )}

                  </div>

                </FormSection>
              ) : (
                <>
                  <FormSection
                    icon={Sparkles}
                    title={t.jobs.dialog.prompt}
                    description={t.jobs.dialog.promptHint}
                  >
                    <Textarea
                      id="job-prompt"
                      rows={6}
                      className="resize-none min-h-[110px]"
                      placeholder={t.jobs.dialog.promptPlaceholder}
                      value={form.prompt}
                      onChange={(e) => updateForm({ prompt: e.target.value })}
                      aria-label={t.jobs.dialog.promptAria}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <p
                        id="job-commands-help"
                        className="min-w-0 flex-1 text-muted-foreground"
                      >
                        {t.jobs.dialog.promptHelp}
                      </p>
                    </div>
                  </FormSection>
                </>
              )}
            </div>

            <DialogFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsDialogOpen(false)}
              >
                {t.jobs.dialog.cancel}
              </Button>
              <Button
                type="submit"
                className="cursor-pointer gap-2"
                disabled={isSaving}
              >
                {isSaving && <Spinner className="h-4 w-4" />}
                {t.jobs.dialog.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.jobs.dialog.deleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.jobs.dialog.deleteConfirmStart}{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>
            {t.jobs.dialog.deleteConfirmEnd}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setDeleteTarget(null)}
            >
              {t.jobs.dialog.cancel}
            </Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              disabled={!deleteTarget || busyId === deleteTarget.id}
              onClick={handleDelete}
            >
              {t.jobs.row.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

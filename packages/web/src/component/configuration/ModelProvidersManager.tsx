"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Edit2,
  Globe,
  Key,
  Loader2,
  PlugZap,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import {
  deleteModelProviderAction,
  getAllModelProvidersAction,
  saveModelProviderAction,
  testModelProviderAction,
} from "@/action/ConfigAction";
import type { ModelProvider } from "@/service/ConfigService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useT } from "@/hooks/useT";
import { interp } from "@/i18n/interp";

/**
 * Espejo del enum `AiProvider` de Prisma (`packages/server/prisma/schema.prisma`).
 * Si se añade un valor al enum hay que añadirlo aquí o el panel no deja elegirlo.
 */
const PROVIDERS = [
  "OPENAI",
  "GOOGLE",
  "OPENROUTER",
  "ANTHROPIC",
  "OLLAMA",
  "LMSTUDIO",
  "CUSTOM",
  "GROK",
  "DEEPSEEK",
  "ZAI",
  "XIAOMI",
  "QWEN",
  "MOONSHOT",
  "META",
] as const;

/** Nombre legible para el `<SelectItem>`: el valor crudo del enum no dice nada al usuario. */
const ETIQUETAS_PROVEEDOR: Record<string, string> = {
  OPENAI: "OpenAI",
  GOOGLE: "Google Gemini",
  OPENROUTER: "OpenRouter",
  ANTHROPIC: "Anthropic (Claude)",
  OLLAMA: "Ollama",
  LMSTUDIO: "LM Studio",
  GROK: "xAI · Grok",
  DEEPSEEK: "DeepSeek",
  ZAI: "Z.ai · GLM",
  XIAOMI: "Xiaomi · MiMo",
  QWEN: "Qwen · DashScope",
  MOONSHOT: "Moonshot · Kimi",
  META: "Meta · Llama",
};

const TYPE_MODELS = ["CHAT", "EMBEDDING"] as const;

const LOCAL_PROVIDERS = ["OLLAMA", "LMSTUDIO", "CUSTOM"];

/** Endpoint por defecto de los proveedores OpenAI-compatible, para mostrarlo de ayuda. */
const URL_POR_DEFECTO: Record<string, string> = {
  GROK: "https://api.x.ai/v1",
  DEEPSEEK: "https://api.deepseek.com/v1",
  ZAI: "https://api.z.ai/api/paas/v4",
  XIAOMI: "https://api.xiaomimimo.com/v1",
  QWEN: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  MOONSHOT: "https://api.moonshot.ai/v1",
  META: "https://api.llama.com/compat/v1",
};

interface ProviderForm {
  id?: string;
  name: string;
  provider: string;
  modelName: string;
  typeModel: string;
  baseUrl: string;
  apiKey: string;
  temperature: number;
  isActive: boolean;
  userPermission: string;
}

const EMPTY_FORM: ProviderForm = {
  name: "",
  provider: "OPENAI",
  modelName: "",
  typeModel: "CHAT",
  baseUrl: "",
  apiKey: "",
  temperature: 0.7,
  isActive: true,
  userPermission: "USER,STAFF,ADMIN",
};

function buildPayload(form: ProviderForm): FormData {
  const fd = new FormData();
  if (form.id) fd.set("id", form.id);
  fd.set("name", form.name.trim());
  fd.set("provider", form.provider);
  fd.set("modelName", form.modelName.trim());
  fd.set("typeModel", form.typeModel);
  if (form.baseUrl.trim()) fd.set("baseUrl", form.baseUrl.trim());
  if (form.apiKey.trim() && form.apiKey !== "[configured]") {
    fd.set("apiKey", form.apiKey.trim());
  }
  fd.set("temperature", String(form.temperature));
  fd.set("isActive", String(form.isActive));
  fd.set("userPermission", form.userPermission.trim());
  return fd;
}

export default function ModelProvidersManager() {
  const t = useT();
  const router = useRouter();
  const [models, setModels] = useState<ModelProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ProviderForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const providerLabel = (provider: string) =>
    provider === "CUSTOM"
      ? t.configuration.models.providers.custom
      : (ETIQUETAS_PROVEEDOR[provider] ?? provider);

  const loadModels = useCallback(async () => {
    const result = await getAllModelProvidersAction();
    if (result.success && Array.isArray(result.data)) {
      setModels(result.data as ModelProvider[]);
    } else {
      notifyError(
        result.message || t.configuration.models.toasts.loadError,
      );
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadModels();
    });
  }, [loadModels]);

  const openCreateDialog = () => {
    setForm({ ...EMPTY_FORM });
    setIsDialogOpen(true);
  };

  const openEditDialog = (model: ModelProvider) => {
    setForm({
      id: model.id,
      name: model.name,
      provider: model.provider || "CUSTOM",
      modelName: model.modelName,
      typeModel: model.typeModel || "CHAT",
      baseUrl: model.baseUrl ?? "",
      apiKey: "",
      temperature: model.temperature ?? 0.7,
      isActive: model.isActive,
      userPermission: model.userPermission ?? "USER,STAFF,ADMIN",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.modelName.trim()) {
      notifyError(t.configuration.models.toasts.required);
      return;
    }
    if (form.temperature < 0 || form.temperature > 2) {
      notifyError(t.configuration.models.toasts.temperatureRange);
      return;
    }
    setSaving(true);
    const result = await saveModelProviderAction(
      { success: false, message: "" },
      buildPayload(form),
    );
    setSaving(false);
    if (result.success) {
      toast.success(result.message || t.configuration.models.toasts.saved);
      playSound(form.id ? "update" : "create");
      setIsDialogOpen(false);
      router.refresh();
      setLoading(true);
      void loadModels();
    } else {
      notifyError(result.message || t.configuration.models.toasts.saveError);
    }
  };

  const handleToggleActive = async (model: ModelProvider, checked: boolean) => {
    const result = await saveModelProviderAction(
      { success: false, message: "" },
      buildPayload({
        id: model.id,
        name: model.name,
        provider: model.provider || "CUSTOM",
        modelName: model.modelName,
        typeModel: model.typeModel || "CHAT",
        baseUrl: model.baseUrl ?? "",
        apiKey: "",
        temperature: model.temperature ?? 0.7,
        isActive: checked,
        userPermission: model.userPermission ?? "USER,STAFF,ADMIN",
      }),
    );
    if (result.success) {
      toast.success(
        checked
          ? t.configuration.models.toasts.activated
          : t.configuration.models.toasts.deactivated,
      );
      playSound("update");
      setModels((prev) =>
        prev.map((m) => (m.id === model.id ? { ...m, isActive: checked } : m)),
      );
      router.refresh();
    } else {
      notifyError(result.message || t.configuration.models.toasts.toggleError);
    }
  };

  const handleDelete = async (model: ModelProvider) => {
    if (
      !confirm(
        interp(t.configuration.models.toasts.deleteConfirm, {
          name: model.name,
        }),
      )
    ) {
      return;
    }
    const result = await deleteModelProviderAction(model.id);
    if (result.success) {
      toast.success(result.message || t.configuration.models.toasts.deleted);
      setModels((prev) => prev.filter((m) => m.id !== model.id));
      router.refresh();
    } else {
      notifyError(result.message || t.configuration.models.toasts.deleteError);
    }
  };

  const handleTestConnection = async () => {
    if (!form.modelName.trim()) {
      notifyError(t.configuration.models.toasts.modelNameRequired);
      return;
    }

    const isLocal = LOCAL_PROVIDERS.includes(form.provider);
    const typedApiKey = form.apiKey.trim();
    const hasFormApiKey =
      typedApiKey.length > 0 && typedApiKey !== "[configured]";

    const storedModel = form.id
      ? models.find((m) => m.id === form.id)
      : undefined;
    const hasStoredApiKey = Boolean(storedModel?.apiKey);

    if (!isLocal && !hasFormApiKey && !hasStoredApiKey) {
      notifyError(t.configuration.models.toasts.apiKeyMissing);
      return;
    }

    setTesting(true);
    try {
      const result = await testModelProviderAction(
        { success: false, message: "" },
        {
          id: form.id || undefined,
          provider: form.provider,
          modelName: form.modelName.trim(),
          typeModel: form.typeModel,
          baseUrl: form.baseUrl.trim() || undefined,
          apiKey: hasFormApiKey ? typedApiKey : undefined,
          temperature: form.temperature,
        },
      );

      if (result.success) {
        toast.success(result.message || t.configuration.models.toasts.testOk);
      } else {
        notifyError(
          result.message || t.configuration.models.toasts.testError,
        );
      }
    } finally {
      setTesting(false);
    }
  };

  const updateForm = <K extends keyof ProviderForm>(
    key: K,
    value: ProviderForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const isLocalSelected = LOCAL_PROVIDERS.includes(form.provider);

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {t.configuration.models.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t.configuration.models.description}
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> {t.configuration.models.add}
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="p-4">{t.configuration.models.columnName}</th>
                <th className="p-4">{t.configuration.models.columnProvider}</th>
                <th className="p-4">{t.configuration.models.columnModel}</th>
                <th className="p-4">{t.configuration.models.columnType}</th>
                <th className="p-4">{t.configuration.models.columnUrl}</th>
                <th className="p-4">{t.configuration.models.columnApiKey}</th>
                <th className="p-4 text-center">
                  {t.configuration.models.columnStatus}
                </th>
                <th className="p-4 text-right">
                  {t.configuration.models.columnActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Spinner /> {t.configuration.models.loading}
                    </span>
                  </td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {t.configuration.models.empty}
                  </td>
                </tr>
              ) : (
                models.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4 font-semibold text-foreground">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        {m.name}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-mono text-xs">
                        {m.provider}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {m.modelName}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          m.typeModel === "EMBEDDING" ? "secondary" : "default"
                        }
                      >
                        {m.typeModel || "CHAT"}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground max-w-[160px] truncate">
                      {m.baseUrl || t.configuration.models.defaultCloud}
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {m.apiKey ? "[configured]" : "—"}
                    </td>
                    <td className="p-4 text-center">
                      <Switch
                        checked={m.isActive}
                        onCheckedChange={(checked: boolean) =>
                          handleToggleActive(m, checked)
                        }
                        aria-label={interp(
                          t.configuration.models.toggleAria,
                          { name: m.name },
                        )}
                      />
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={interp(t.configuration.models.editAria, {
                          name: m.name,
                        })}
                        onClick={() => openEditDialog(m)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        aria-label={interp(
                          t.configuration.models.deleteAria,
                          { name: m.name },
                        )}
                        onClick={() => handleDelete(m)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id
                ? t.configuration.models.editTitle
                : t.configuration.models.newTitle}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="provider-name">
                  {t.configuration.models.fields.name}
                </Label>
                <Input
                  id="provider-name"
                  placeholder={t.configuration.models.fields.namePlaceholder}
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t.configuration.models.fields.provider}</Label>
                <Select
                  value={form.provider}
                  onValueChange={(val) => updateForm("provider", val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {providerLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.configuration.models.fields.typeModel}</Label>
                <Select
                  value={form.typeModel}
                  onValueChange={(val) => updateForm("typeModel", val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_MODELS.map((typeModel) => (
                      <SelectItem key={typeModel} value={typeModel}>
                        {typeModel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="provider-model-name">
                  {t.configuration.models.fields.modelId}
                </Label>
                <Input
                  id="provider-model-name"
                  placeholder={
                    t.configuration.models.fields.modelIdPlaceholder
                  }
                  value={form.modelName}
                  onChange={(e) => updateForm("modelName", e.target.value)}
                  required
                />
              </div>

              {isLocalSelected && (
                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="provider-base-url"
                    className="flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />{" "}
                    {t.configuration.models.fields.baseUrl}
                  </Label>
                  <Input
                    id="provider-base-url"
                    placeholder={
                      URL_POR_DEFECTO[form.provider] ??
                      t.configuration.models.fields.baseUrlPlaceholder
                    }
                    value={form.baseUrl}
                    onChange={(e) => updateForm("baseUrl", e.target.value)}
                  />
                  {URL_POR_DEFECTO[form.provider] && !form.baseUrl.trim() && (
                    <p className="text-[11px] text-muted-foreground">
                      {interp(
                        t.configuration.models.fields.defaultEndpoint,
                        { provider: providerLabel(form.provider) },
                      )}{" "}
                      <code className="font-mono">{URL_POR_DEFECTO[form.provider]}</code>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label
                  htmlFor="provider-api-key"
                  className="flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />{" "}
                  {t.configuration.models.fields.apiKey}{" "}
                  {isLocalSelected
                    ? t.configuration.models.fields.apiKeyOptional
                    : ""}
                </Label>
                <Input
                  id="provider-api-key"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    form.id
                      ? t.configuration.models.fields.apiKeyPlaceholderEdit
                      : t.configuration.models.fields.apiKeyPlaceholderNew
                  }
                  value={form.apiKey}
                  onChange={(e) => updateForm("apiKey", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-temperature">
                  {t.configuration.models.fields.temperature}
                </Label>
                <Input
                  id="provider-temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={form.temperature}
                  onChange={(e) =>
                    updateForm("temperature", Number(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-permissions">
                  {t.configuration.models.fields.permissions}
                </Label>
                <Input
                  id="provider-permissions"
                  placeholder={
                    t.configuration.models.fields.permissionsPlaceholder
                  }
                  value={form.userPermission}
                  onChange={(e) => updateForm("userPermission", e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">
                    {t.configuration.models.fields.active}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.configuration.models.fields.activeHint}
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked: boolean) =>
                    updateForm("isActive", checked)
                  }
                  aria-label={t.configuration.models.fields.activeAria}
                />
              </div>
            </div>

            <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={testing || saving}
                onClick={() => void handleTestConnection()}
                className="w-full sm:w-auto gap-2"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlugZap className="w-4 h-4" />
                )}
                {testing
                  ? t.configuration.models.testing
                  : t.configuration.models.test}
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 sm:flex-none"
                >
                  {t.configuration.models.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.configuration.models.save}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

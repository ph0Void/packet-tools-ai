"use server";

import { revalidatePath } from "next/cache";
import {
  deleteModelProvider,
  getAvailableModels,
  getConfig,
  getModelProviders,
  saveModelProvider,
  testModelProvider,
  updateAgentLogsEnabled,
  updateSystemPrompt,
  type TestModelProviderInput,
} from "@/service/ConfigService";
import { getServerDictionary } from "@/i18n/server";
import type { FormState } from "@/types/actions";

export type FormConfigState = FormState;

export async function getSystemConfigAction(): Promise<FormConfigState> {
  const t = await getServerDictionary();
  const result = await getConfig();

  if (!result.success || !result.data) {
    return {
      success: false,
      message: result.message || t.forms.notAuthorized,
      data: null,
    };
  }

  return {
    success: true,
    message: t.forms.config.fetched,
    data: result.data,
  };
}

export async function getAvailableModelsAction(): Promise<FormConfigState> {
  const t = await getServerDictionary();
  const result = await getAvailableModels();

  if (!result.success) {
    return {
      success: false,
      message: result.message || t.forms.config.modelsFetchError,
      data: [],
    };
  }

  return { success: true, message: t.forms.config.modelsFetched, data: result.data ?? [] };
}

export async function getAllModelProvidersAction(): Promise<FormConfigState> {
  const t = await getServerDictionary();
  const result = await getModelProviders();

  if (!result.success) {
    return {
      success: false,
      message: result.message || t.forms.config.providersFetchError,
      data: [],
    };
  }

  return {
    success: true,
    message: t.forms.config.providersFetched,
    data: result.data ?? [],
  };
}

export async function saveModelProviderAction(
  prevState: FormConfigState,
  formData: FormData,
): Promise<FormConfigState> {
  const t = await getServerDictionary();
  const messages = t.forms.config;

  try {
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    const provider = formData.get("provider") as string;
    const modelName = (formData.get("modelName") as string)?.trim();
    const typeModel = formData.get("typeModel") as string;
    const baseUrl = formData.get("baseUrl") as string;
    const apiKey = formData.get("apiKey") as string;
    const temperature = formData.get("temperature")
      ? Number(formData.get("temperature"))
      : 0.7;
    const isActive = formData.get("isActive") !== "false";
    const userPermission =
      (formData.get("userPermission") as string) || "USER,STAFF,ADMIN";

    if (!name || !modelName) {
      return {
        success: false,
        message: messages.providerRequired,
      };
    }

    const result = await saveModelProvider({
      ...(id ? { id } : {}),
      name,
      provider: provider || "CUSTOM",
      modelName,
      ...(typeModel ? { typeModel } : {}),
      baseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      temperature:
        Number.isFinite(temperature) && temperature >= 0
          ? temperature
          : 0.7,
      isActive,
      userPermission,
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/configuration");
    return {
      success: true,
      message: messages.providerSaved,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en saveModelProviderAction:", error);
    return { success: false, message: messages.providerSaveError };
  }
}

export async function testModelProviderAction(
  prevState: FormConfigState,
  payload: TestModelProviderInput,
): Promise<FormConfigState> {
  const t = await getServerDictionary();
  void prevState;

  try {
    const result = await testModelProvider(payload);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    return {
      success: true,
      message: result.message || t.forms.config.connectionOk,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en testModelProviderAction:", error);
    return { success: false, message: t.forms.config.connectionError };
  }
}

export async function deleteModelProviderAction(
  idModel: string,
): Promise<FormConfigState> {
  const t = await getServerDictionary();

  try {
    const result = await deleteModelProvider(idModel);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/configuration");
    return { success: true, message: t.forms.config.providerDeleted };
  } catch (error) {
    console.error("Error en deleteModelProviderAction:", error);
    return { success: false, message: t.forms.config.providerDeleteError };
  }
}

export async function updateSystemPromptAction(
  prevState: FormConfigState,
  formData: FormData,
): Promise<FormConfigState> {
  const t = await getServerDictionary();

  try {
    const systemPrompt = String(formData.get("systemPrompt") ?? "").trim();

    if (!systemPrompt) {
      return {
        ...prevState,
        success: false,
        message: t.forms.config.systemPromptRequired,
      };
    }

    const result = await updateSystemPrompt(systemPrompt);

    if (!result.success) {
      return { ...prevState, success: false, message: result.message };
    }

    revalidatePath("/dashboard/configuration");
    return {
      success: true,
      message: t.forms.config.systemPromptUpdated,
    };
  } catch (error) {
    console.error("Error en updateSystemPromptAction:", error);
    return {
      ...prevState,
      success: false,
      message: t.forms.config.configUpdateError,
    };
  }
}

export async function updateAgentLogsEnabledAction(
  enabled: boolean,
): Promise<FormConfigState> {
  const t = await getServerDictionary();
  const messages = t.forms.config;

  try {
    const result = await updateAgentLogsEnabled(enabled);

    if (!result.success) {
      return {
        success: false,
        message: result.message || messages.agentLogsToggleError,
      };
    }

    revalidatePath("/dashboard/configuration");
    return {
      success: true,
      message:
        result.message ||
        (enabled ? messages.agentLogsEnabled : messages.agentLogsDisabled),
      data: result.data,
    };
  } catch (error) {
    console.error("Error en updateAgentLogsEnabledAction:", error);
    return {
      success: false,
      message: messages.agentLogsChangeError,
    };
  }
}

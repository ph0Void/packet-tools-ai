"use server";

import { revalidatePath } from "next/cache";
import {
  deleteJob,
  getJobs,
  runJob,
  saveJob,
  setJobActive,
} from "@/service/CronJobService";
import type {
  CronJobInput,
  CronJobRunResult,
} from "@/service/CronJobService";
import { getServerDictionary } from "@/i18n/server";
import type { FormState } from "@/types/actions";

export type FormCronJobState<T = unknown> = FormState<T>;

const RUTA_AUTOMATIZACIONES = "/dashboard/jobs";

function parseConfig(raw: string | null): Record<string, unknown> | undefined {
  if (!raw || !raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export async function createCronJobAction(
  prevState: FormCronJobState,
  formData: FormData,
): Promise<FormCronJobState> {
  const t = await getServerDictionary();
  const messages = t.forms.jobs;

  try {
    const name = (formData.get("name") as string)?.trim();
    const description = formData.get("description") as string;
    const cronExpression = formData.get("cronExpression") as string;
    const actionTypeRaw = formData.get("actionType") as string;
    const actionType = actionTypeRaw === "INTELLIGENT" ? "INTELLIGENT" : "STANDARD";
    const prompt = formData.get("prompt") as string;
    const config = parseConfig(formData.get("payload") as string | null);
    const isActive = formData.get("isActive") !== "false";
    const topologyId = formData.get("topologyId") as string;
    const deviceProviderId = formData.get("deviceProviderId") as string;

    if (!name) {
      return {
        success: false,
        message: messages.fieldsRequired,
      };
    }

    const input: CronJobInput = {
      name,
      description: description?.trim() ? description.trim() : undefined,
      cronExpression: cronExpression?.trim() ? cronExpression.trim() : undefined,
      actionType,
      prompt: prompt?.trim() ? prompt.trim() : undefined,
      ...(config !== undefined ? { config } : {}),
      isActive,
      deviceProviderId: deviceProviderId?.trim() ? deviceProviderId.trim() : undefined,
      topologyId: topologyId?.trim() ? topologyId.trim() : undefined,
    };

    const result = await saveJob(input);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath(RUTA_AUTOMATIZACIONES);
    return {
      success: true,
      message: result.message || messages.created,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en createCronJobAction:", error);
    return {
      success: false,
      message: messages.createError,
    };
  }
}

export async function getAllCronJobsAction(): Promise<FormCronJobState> {
  const t = await getServerDictionary();
  const result = await getJobs();

  if (!result.success) {
    return {
      success: false,
      message: result.message || t.forms.jobs.fetchError,
      data: [],
    };
  }

  return { success: true, message: result.message, data: result.data ?? [] };
}

export async function toggleCronJobAction(
  id: string,
  isActive: boolean,
): Promise<FormCronJobState> {
  const t = await getServerDictionary();
  const result = await setJobActive(id, isActive);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath(RUTA_AUTOMATIZACIONES);
  return {
    success: true,
    message: result.message || t.forms.jobs.statusUpdated,
  };
}

export async function deleteCronJobAction(
  id: string,
): Promise<FormCronJobState> {
  const t = await getServerDictionary();
  const result = await deleteJob(id);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath(RUTA_AUTOMATIZACIONES);
  return { success: true, message: result.message || t.forms.jobs.deleted };
}

export async function runJobAction(
  id: string,
): Promise<FormCronJobState<CronJobRunResult>> {
  const t = await getServerDictionary();
  const result = await runJob(id);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath(RUTA_AUTOMATIZACIONES);
  return {
    success: true,
    message: result.message || t.forms.jobs.run,
    data: result.data ?? undefined,
  };
}

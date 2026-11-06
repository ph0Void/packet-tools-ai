"use server";

import { revalidatePath } from "next/cache";
import {
  createAlert,
  deleteAlert,
  updateAlert,
} from "@/service/AlertService";
import { getServerDictionary } from "@/i18n/server";
import type { FormState } from "@/types/actions";

export type FormAlertState = FormState;

export async function createAlertAction(
  prevState: FormAlertState,
  formData: FormData,
): Promise<FormAlertState> {
  const t = await getServerDictionary();
  const messages = t.forms.alerts;

  try {
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const severity = String(formData.get("severity") ?? "").trim();
    const topologyId = String(formData.get("topology") ?? "").trim();

    if (!title || !description || !topologyId) {
      return {
        success: false,
        message: messages.requiredFields,
      };
    }

    const result = await createAlert({
      title,
      description,
      severity: severity || "INFO",
      topologyId,
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/alert");
    return { success: true, message: messages.created };
  } catch (error) {
    console.error("Error en createAlertAction:", error);
    return { success: false, message: messages.createError };
  }
}

export async function updateAlertAction(
  prevState: FormAlertState,
  formData: FormData,
): Promise<FormAlertState> {
  const t = await getServerDictionary();
  const messages = t.forms.alerts;

  try {
    const id = formData.get("id");
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const severity = String(formData.get("severity") ?? "").trim();
    const topologyId = String(formData.get("topology") ?? "").trim();

    if (!id) {
      return { success: false, message: messages.idMissing };
    }

    const result = await updateAlert(String(id), {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(severity ? { severity } : {}),
      ...(topologyId ? { topologyId } : {}),
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/alert");
    return {
      success: true,
      message: messages.updated,
    };
  } catch (error) {
    console.error("Error en updateAlertAction:", error);
    return { success: false, message: messages.updateError };
  }
}

export async function solveAlertAction(id: string): Promise<FormAlertState> {
  const t = await getServerDictionary();
  const result = await updateAlert(id, { resolved: true });

  if (result.success) revalidatePath("/dashboard/alert");

  return {
    success: result.success,
    message:
      result.message ||
      (result.success ? t.forms.alerts.resolved : t.forms.alerts.resolveFailed),
  };
}

export async function toggleAlertResolvedAction(
  id: string,
  resolved: boolean,
): Promise<FormAlertState> {
  const t = await getServerDictionary();
  const result = await updateAlert(id, { resolved });

  if (result.success) revalidatePath("/dashboard/alert");

  return {
    success: result.success,
    message:
      result.message ||
      (result.success
        ? t.forms.alerts.statusUpdated
        : t.forms.alerts.statusFailed),
  };
}

export async function deleteAlertAction(id: string): Promise<FormAlertState> {
  const t = await getServerDictionary();
  const result = await deleteAlert(id);

  if (result.success) revalidatePath("/dashboard/alert");

  return {
    success: result.success,
    message:
      result.message ||
      (result.success ? t.forms.alerts.deleted : t.forms.alerts.deleteFailed),
  };
}

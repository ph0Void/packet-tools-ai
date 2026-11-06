"use server";

import { revalidatePath } from "next/cache";
import {
  createSkill,
  deleteSkill,
  getSkills,
  updateSkill,
  type Skill,
} from "@/service/SkillService";
import { getServerDictionary } from "@/i18n/server";
import { interp } from "@/i18n/interp";
import type { FormState } from "@/types/actions";

/**
 * Genérica como `FormCronJobState`: el listado devuelve `Skill[]` y las mutaciones
 * devuelven una sola `Skill`, así que el parámetro distingue ambas formas en vez de
 * apelar a `FormState` sin parametrizar (que dejaría `data` como `unknown`).
 */
export type FormSkillState<T = Skill[]> = FormState<T>;

const RUTA_SKILLS = "/dashboard/skills";

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 1024;
const MAX_CONTENT = 100_000;

export async function getSkillsAction(): Promise<FormSkillState> {
  const t = await getServerDictionary();
  const result = await getSkills();

  if (!result.success) {
    return {
      success: false,
      message: result.message || t.forms.skills.fetchError,
      data: [],
    };
  }

  return { success: true, message: result.message, data: result.data ?? [] };
}

export async function createSkillAction(
  prevState: FormSkillState<Skill>,
  formData: FormData,
): Promise<FormSkillState<Skill>> {
  const t = await getServerDictionary();
  const messages = t.forms.skills;

  try {
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title) {
      return { success: false, message: messages.titleRequired };
    }
    if (title.length > MAX_TITLE) {
      return { success: false, message: messages.titleTooLong };
    }
    if (description.length > MAX_DESCRIPTION) {
      return { success: false, message: messages.descriptionTooLong };
    }
    if (!content) {
      return { success: false, message: messages.contentRequired };
    }
    if (content.length > MAX_CONTENT) {
      return { success: false, message: messages.contentTooLong };
    }

    const result = await createSkill({
      title,
      description: description || null,
      content,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || messages.createFailed,
      };
    }

    revalidatePath(RUTA_SKILLS);
    return {
      success: true,
      message: interp(messages.created, { slug: result.data.slug }),
      data: result.data,
    };
  } catch (error) {
    console.error("Error en createSkillAction:", error);
    return { success: false, message: messages.createError };
  }
}

export async function updateSkillAction(
  prevState: FormSkillState<Skill>,
  formData: FormData,
): Promise<FormSkillState<Skill>> {
  const t = await getServerDictionary();
  const messages = t.forms.skills;

  try {
    const id = String(formData.get("id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!id) {
      return { success: false, message: messages.idMissing };
    }
    if (!title) {
      return { success: false, message: messages.titleRequired };
    }
    if (!content) {
      return { success: false, message: messages.contentRequired };
    }

    const result = await updateSkill(id, {
      title,
      description: description || null,
      content,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || messages.updateFailed,
      };
    }

    revalidatePath(RUTA_SKILLS);
    return {
      success: true,
      message: interp(messages.updated, { slug: result.data.slug }),
      data: result.data,
    };
  } catch (error) {
    console.error("Error en updateSkillAction:", error);
    return { success: false, message: messages.updateError };
  }
}

export async function deleteSkillAction(id: string): Promise<FormSkillState> {
  const t = await getServerDictionary();
  const result = await deleteSkill(id);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath(RUTA_SKILLS);
  return { success: true, message: result.message || t.forms.skills.deleted };
}

export async function toggleSkillAction(
  id: string,
  enabled: boolean,
): Promise<FormSkillState<Skill>> {
  const t = await getServerDictionary();
  const messages = t.forms.skills;
  const result = await updateSkill(id, { enabled });

  if (!result.success) {
    return {
      success: false,
      message: result.message || messages.toggleFailed,
    };
  }

  revalidatePath(RUTA_SKILLS);
  return {
    success: true,
    message:
      result.message || (enabled ? messages.enabled : messages.disabled),
    data: result.data ?? undefined,
  };
}

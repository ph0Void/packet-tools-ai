"use server";

import { revalidatePath } from "next/cache";
import {
  createSkill,
  deleteSkill,
  getSkills,
  updateSkill,
  type Skill,
} from "@/service/SkillService";
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
  const result = await getSkills();

  if (!result.success) {
    return {
      success: false,
      message: result.message || "Error al obtener las skills.",
      data: [],
    };
  }

  return { success: true, message: result.message, data: result.data ?? [] };
}

export async function createSkillAction(
  prevState: FormSkillState<Skill>,
  formData: FormData,
): Promise<FormSkillState<Skill>> {
  try {
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title) {
      return { success: false, message: "El título es obligatorio." };
    }
    if (title.length > MAX_TITLE) {
      return { success: false, message: "El título es demasiado largo." };
    }
    if (description.length > MAX_DESCRIPTION) {
      return { success: false, message: "La descripción es demasiado larga." };
    }
    if (!content) {
      return { success: false, message: "El contenido es obligatorio." };
    }
    if (content.length > MAX_CONTENT) {
      return { success: false, message: "El contenido es demasiado largo." };
    }

    const result = await createSkill({
      title,
      description: description || null,
      content,
    });

    if (!result.success || !result.data) {
      return { success: false, message: result.message || "No se pudo crear la skill." };
    }

    revalidatePath(RUTA_SKILLS);
    return {
      success: true,
      message: `Skill creada. Invócala con @skill:${result.data.slug}`,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en createSkillAction:", error);
    return { success: false, message: "Error al crear la skill." };
  }
}

export async function updateSkillAction(
  prevState: FormSkillState<Skill>,
  formData: FormData,
): Promise<FormSkillState<Skill>> {
  try {
    const id = String(formData.get("id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!id) {
      return { success: false, message: "No se ha identificado la skill a actualizar." };
    }
    if (!title) {
      return { success: false, message: "El título es obligatorio." };
    }
    if (!content) {
      return { success: false, message: "El contenido es obligatorio." };
    }

    const result = await updateSkill(id, {
      title,
      description: description || null,
      content,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || "No se pudo actualizar la skill.",
      };
    }

    revalidatePath(RUTA_SKILLS);
    return {
      success: true,
      message: `Skill actualizada. Su identificador sigue siendo ${result.data.slug}`,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en updateSkillAction:", error);
    return { success: false, message: "Error al actualizar la skill." };
  }
}

export async function deleteSkillAction(id: string): Promise<FormSkillState> {
  const result = await deleteSkill(id);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath(RUTA_SKILLS);
  return { success: true, message: result.message || "Skill eliminada." };
}

export async function toggleSkillAction(
  id: string,
  enabled: boolean,
): Promise<FormSkillState<Skill>> {
  const result = await updateSkill(id, { enabled });

  if (!result.success) {
    return {
      success: false,
      message: result.message || "No se pudo cambiar el estado de la skill.",
    };
  }

  revalidatePath(RUTA_SKILLS);
  return {
    success: true,
    message: result.message ||
      (enabled ? "Skill habilitada." : "Skill deshabilitada."),
    data: result.data ?? undefined,
  };
}
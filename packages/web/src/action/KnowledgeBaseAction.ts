"use server";

import { revalidatePath } from "next/cache";
import {
  deleteDocument,
  getDocuments,
  uploadDocument,
} from "@/service/KnowledgeBaseService";
import { getServerDictionary } from "@/i18n/server";
import type { FormState } from "@/types/actions";
import type { Dictionary } from "@/i18n";

export type FormKnowledgeState = FormState;

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function validateFile(
  file: File,
  messages: Dictionary["forms"]["knowledge"],
): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return messages.fileTypeNotAllowed;
  }

  if (file.size > MAX_FILE_SIZE) {
    return messages.fileTooLarge;
  }

  return null;
}

export async function getDocumentsAction(): Promise<FormKnowledgeState> {
  const t = await getServerDictionary();
  const result = await getDocuments();

  if (!result.success) {
    return {
      success: false,
      message: result.message || t.forms.knowledge.fetchError,
      data: [],
    };
  }

  return { success: true, message: result.message, data: result.data ?? [] };
}

export async function uploadDocumentAction(
  prevState: FormKnowledgeState,
  formData: FormData,
): Promise<FormKnowledgeState> {
  const t = await getServerDictionary();
  const messages = t.forms.knowledge;

  try {
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return { success: false, message: messages.fileRequired };
    }

    const validationError = validateFile(fileEntry, messages);
    if (validationError) {
      return { success: false, message: validationError };
    }

    // El backend aplica min(1) a `title`; si llega "" rechaza el envío.
    // Sin título, se omite el campo y el backend usa el nombre del archivo.
    const rawTitle = formData.get("title");
    const trimmedTitle = typeof rawTitle === "string" ? rawTitle.trim() : "";
    if (trimmedTitle === "") {
      formData.delete("title");
    } else if (trimmedTitle !== rawTitle) {
      formData.set("title", trimmedTitle);
    }

    const result = await uploadDocument(formData);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/data");
    return {
      success: true,
      message: result.message || messages.uploaded,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en uploadDocumentAction:", error);
    return { success: false, message: messages.uploadError };
  }
}

export async function deleteDocumentAction(
  id: string,
): Promise<FormKnowledgeState> {
  const t = await getServerDictionary();
  const result = await deleteDocument(id);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath("/dashboard/data");
  return { success: true, message: result.message || t.forms.knowledge.deleted };
}

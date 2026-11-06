"use server";

import { revalidatePath } from "next/cache";
import {
  createChat,
  deleteChat,
  getChats,
  getMessages,
  updateChatSelection,
  type ChatSelectionPayload,
} from "@/service/ChatService";
import { getServerDictionary } from "@/i18n/server";

export type ChatActionState = {
  success: boolean;
  message: string;
  data?: unknown;
};

export async function getChatsAction(): Promise<ChatActionState> {
  const t = await getServerDictionary();
  const result = await getChats();
  return {
    success: result.success,
    message: result.message || t.forms.chat.listFetched,
    data: result.data ?? [],
  };
}

export async function createChatAction(
  title?: string,
): Promise<ChatActionState> {
  const t = await getServerDictionary();

  try {
    const result = await createChat(title);

    if (!result.success || !result.data) {
      return { success: false, message: result.message, data: null };
    }

    revalidatePath("/dashboard/chat");
    return {
      success: true,
      message: t.forms.chat.created,
      data: result.data,
    };
  } catch (error) {
    console.error("Error al crear sesión de chat:", error);
    return {
      success: false,
      message: t.forms.chat.createError,
      data: null,
    };
  }
}

export async function getChatMessages(
  chatId: string,
): Promise<ChatActionState> {
  const t = await getServerDictionary();
  const result = await getMessages(chatId);
  return {
    success: result.success,
    message: result.message || t.forms.chat.messagesFetched,
    data: result.data ?? [],
  };
}

export async function updateChatSelectionAction(
  chatId: string,
  payload: ChatSelectionPayload,
): Promise<ChatActionState> {
  const t = await getServerDictionary();

  try {
    const result = await updateChatSelection(chatId, payload);

    if (!result.success) {
      return { success: false, message: result.message, data: null };
    }

    return {
      success: true,
      message: result.message || t.forms.chat.selectionUpdated,
      data: result.data,
    };
  } catch (error) {
    console.error("Error al actualizar la selección del chat:", error);
    return {
      success: false,
      message: t.forms.chat.selectionError,
      data: null,
    };
  }
}

export async function deleteChatAction(
  chatId: string,
): Promise<ChatActionState> {
  const t = await getServerDictionary();

  try {
    const result = await deleteChat(chatId);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/chat");
    return { success: true, message: t.forms.chat.deleted };
  } catch (error) {
    console.error("Error al eliminar sesión de chat:", error);
    return {
      success: false,
      message: t.forms.chat.deleteError,
    };
  }
}

export type SendMessageState = {
  chatId: string;
  content: string;
  userMessageId: string;
  isNew: boolean;
} | null;

export async function sendMessageAction(
  prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  try {
    const content = String(formData.get("content") ?? "").trim();
    const chatIdInput = String(formData.get("chatId") ?? "") || null;

    if (!content) return prevState;

    let activeChatId = chatIdInput;
    let isNew = false;

    if (!activeChatId) {
      const created = await createChat(content.substring(0, 45));
      if (!created.success || !created.data) return prevState;
      activeChatId = created.data.id;
      isNew = true;
      revalidatePath("/dashboard/chat");
    }

    return { chatId: activeChatId, content, userMessageId: "", isNew };
  } catch (error) {
    console.error("Error en sendMessageAction:", error);
    return prevState;
  }
}

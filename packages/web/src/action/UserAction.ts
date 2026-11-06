"use server";

import { revalidatePath } from "next/cache";
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
  type AppUser,
} from "@/service/UserService";
import { getServerDictionary } from "@/i18n/server";
import type { FormState } from "@/types/actions";

export type FormUserState = FormState<AppUser[]>;

export async function getAllUsersAction(
  page: number = 1,
  limit: number = 10,
): Promise<FormUserState> {
  const result = await getAllUsers();

  if (!result.success || !result.data) {
    return { success: false, message: result.message, data: [] };
  }

  const start = (page - 1) * limit;
  return {
    success: true,
    message: result.message,
    data: result.data.slice(start, start + limit),
  };
}

export async function registerUserAction(
  prevState: FormUserState,
  formData: FormData,
): Promise<FormUserState> {
  const t = await getServerDictionary();
  const messages = t.forms.users;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "USER");
  const role =
    roleRaw === "ADMIN" || roleRaw === "STAFF" ? roleRaw : "USER";

  if (!username || !password) {
    return {
      ...prevState,
      success: false,
      message: messages.credentialsRequired,
    };
  }

  const result = await createUser({ username, password, role });

  if (!result.success) {
    return { ...prevState, success: false, message: result.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true, message: result.message || messages.created };
}

export async function updateUserAction(
  prevState: FormUserState,
  formData: FormData,
): Promise<FormUserState> {
  const t = await getServerDictionary();
  const messages = t.forms.users;
  const id = String(formData.get("id") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "USER");
  const role =
    roleRaw === "ADMIN" || roleRaw === "STAFF" ? roleRaw : "USER";

  if (!id) {
    return {
      ...prevState,
      success: false,
      message: messages.idMissing,
    };
  }

  const result = await updateUser(id, {
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    role,
  });

  if (!result.success) {
    return { ...prevState, success: false, message: result.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true, message: result.message || messages.updated };
}

export async function deleteUserAction(id: string): Promise<FormUserState> {
  const t = await getServerDictionary();
  const result = await deleteUser(id);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true, message: result.message || t.forms.users.deleted };
}

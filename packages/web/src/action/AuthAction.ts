"use server";

import {
  loginAuthService,
  logoutAuthService,
  registerAuthService,
} from "@/service/AuthService";
import { deleteCookieToken, saveCookieToken } from "@/utils/CookieHelper";
import { getServerDictionary } from "@/i18n/server";
import type { FormState as BaseFormState } from "@/types/actions";

export type FormState = BaseFormState;

export async function loginAction(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = await getServerDictionary();
  const messages = t.forms.auth;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username) {
    return { success: false, message: messages.usernameRequired };
  }

  if (!password) {
    return { success: false, message: messages.passwordRequired };
  }

  try {
    const result = await loginAuthService(username, password);

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || messages.invalidCredentials,
      };
    }

    await saveCookieToken(result.data.token);

    return {
      success: true,
      message: messages.loginSuccess,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en loginAction:", error);
    return {
      success: false,
      message: messages.unexpectedError,
    };
  }
}

export async function registerAction(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = await getServerDictionary();
  const messages = t.forms.auth;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username) {
    return { success: false, message: messages.usernameRequired };
  }

  if (!password || password.length < 6) {
    return {
      success: false,
      message: messages.passwordRequiredMin,
    };
  }

  try {
    const result = await registerAuthService(username, password);

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || messages.registerFailed,
      };
    }

    return {
      success: true,
      message: messages.registerSuccess,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en registerAction:", error);
    return {
      success: false,
      message: messages.unexpectedError,
    };
  }
}

export async function logoutAction(): Promise<FormState> {
  const t = await getServerDictionary();

  try {
    await logoutAuthService();
  } catch (error) {
    console.error("Error al cerrar sesión en el backend:", error);
  }

  await deleteCookieToken();

  return {
    success: true,
    message: t.forms.auth.logoutSuccess,
  };
}

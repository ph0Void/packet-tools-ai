import { getDictionary } from "@/i18n";
import { LOCALE_COOKIE } from "@/i18n/types";
import { interp } from "@/i18n/interp";
import type { DeviceProvider } from "@/service/DeviceProviderService";
import type { ApiResponse } from "@/service/client/ApiClient";

const esEnglish = (): boolean =>
  typeof document !== "undefined" &&
  new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=en(?:;|$)`).test(document.cookie);

export interface TerminalActiveSession {
  sessionId: string;
  deviceName: string | null;
  protocol: string | null;
  providerId: string | null;
  busy: boolean;
  prompt: string | null;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export async function getActiveSessions(): Promise<TerminalActiveSession[]> {
  try {
    const res = await fetch("/api/terminal/sessions", {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json()) as ApiEnvelope<TerminalActiveSession[]>;
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function getConnectionDevices(): Promise<DeviceProvider[]> {
  try {
    const res = await fetch("/api/devices", {
      credentials: "include",
      cache: "no-store",
    });
    const json = (await res.json()) as ApiEnvelope<DeviceProvider[]>;
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export interface TerminalOpenConfirmBody {
  accepted: boolean;
  sessionId?: string;
  error?: string;
}

export interface TerminalOpenConfirmResult {
  requestId: string;
  accepted: boolean;
}

export async function confirmTerminalOpen(
  requestId: string,
  body: TerminalOpenConfirmBody,
): Promise<ApiResponse<TerminalOpenConfirmResult>> {
  try {
    const res = await fetch(
      `/api/chats/terminal-open/${encodeURIComponent(requestId)}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const json = (await res
      .json()
      .catch(() => null)) as ApiResponse<TerminalOpenConfirmResult> | null;
    if (!res.ok || !json?.success) {
      return {
        success: false,
        message:
          json?.message ||
          interp(
            getDictionary(esEnglish() ? "en" : "es").forms.terminalConfirmError,
            { status: res.status },
          ),
        data: null,
      };
    }
    return json;
  } catch {
    return {
      success: false,
      message: getDictionary(esEnglish() ? "en" : "es").errors.connectionError,
      data: null,
    };
  }
}

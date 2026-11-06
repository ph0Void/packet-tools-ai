"use server";

import { revalidatePath } from "next/cache";
import {
  deleteDevice,
  getDevices,
  saveDevice,
  testDeviceConnection,
} from "@/service/DeviceProviderService";
import type {
  DeviceProviderInput,
  DeviceTestInput,
} from "@/service/DeviceProviderService";
import { getServerDictionary } from "@/i18n/server";
import type { FormState } from "@/types/actions";

export type FormDeviceState = FormState;

export async function saveDeviceProviderAction(
  prevState: FormDeviceState,
  formData: FormData,
): Promise<FormDeviceState> {
  const t = await getServerDictionary();
  const messages = t.forms.devices;

  try {
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    const typeDevice = (formData.get("typeDevice") as string)?.trim();
    const protocol = (formData.get("protocol") as string)?.trim();
    const host = (formData.get("host") as string)?.trim();
    const portRaw = formData.get("port") as string;
    const serialPort = (formData.get("serialPort") as string)?.trim();
    const serialBaudrateRaw = formData.get("serialBaudrate") as string;
    const username = (formData.get("username") as string)?.trim();
    const password = formData.get("password") as string;

    if (!name) {
      return {
        success: false,
        message: messages.nameRequired,
      };
    }

    const port = portRaw?.trim() ? Number(portRaw) : undefined;
    const serialBaudrate = serialBaudrateRaw?.trim()
      ? Number(serialBaudrateRaw)
      : undefined;

    if (protocol === "SERIAL") {
      if (!serialPort) {
        return {
          success: false,
          message: messages.serialPortRequired,
        };
      }
      if (
        serialBaudrate !== undefined &&
        (!Number.isFinite(serialBaudrate) ||
          serialBaudrate < 300 ||
          serialBaudrate > 921600)
      ) {
        return {
          success: false,
          message: messages.baudrateRange,
        };
      }
    } else if (protocol === "SSH" || protocol === "TELNET") {
      if (!host) {
        return {
          success: false,
          message: messages.hostRequired,
        };
      }
      if (
        port !== undefined &&
        (!Number.isFinite(port) || port < 1 || port > 65535)
      ) {
        return {
          success: false,
          message: messages.portRange,
        };
      }
    } else if (protocol === "SIMULATION") {
      if (!host) {
        return {
          success: false,
          message: messages.simulationHostRequired,
        };
      }
    }

    const payload: DeviceProviderInput & { id?: string } = {
      ...(id ? { id } : {}),
      name,
      ...(typeDevice ? { typeDevice } : {}),
      ...(protocol ? { protocol } : {}),
      host: host || null,
      port: port ?? null,
      username: username || null,

      ...(password ? { password } : {}),
      serialPort: serialPort || null,
      serialBaudrate: serialBaudrate ?? null,
    };

    const result = await saveDevice(payload);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/connection");
    return {
      success: true,
      message: result.message || messages.saved,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en saveDeviceProviderAction:", error);
    return {
      success: false,
      message: messages.saveError,
    };
  }
}

export async function getAllDeviceProvidersAction(): Promise<FormDeviceState> {
  const t = await getServerDictionary();
  const result = await getDevices();

  if (!result.success) {
    return {
      success: false,
      message: result.message || t.forms.notAuthorized,
      data: [],
    };
  }

  return { success: true, message: result.message, data: result.data ?? [] };
}

export async function deleteDeviceProviderAction(
  id: string,
): Promise<FormDeviceState> {
  const t = await getServerDictionary();
  const result = await deleteDevice(id);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath("/dashboard/connection");
  return { success: true, message: result.message || t.forms.devices.deleted };
}

export async function keepDeviceProviderAction(
  id: string,
  name?: string,
): Promise<FormDeviceState> {
  const t = await getServerDictionary();

  try {
    const result = await saveDevice({
      id,
      ...(name ? { name } : {}),
      isTemporary: false,
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/connection");
    return {
      success: true,
      message: result.message || t.forms.devices.kept,
      data: result.data,
    };
  } catch (error) {
    console.error("Error en keepDeviceProviderAction:", error);
    return {
      success: false,
      message: t.forms.devices.keepError,
    };
  }
}

export async function testDeviceConnectionAction(
  payload: DeviceTestInput,
): Promise<{ success: boolean; message: string }> {
  const t = await getServerDictionary();

  try {
    const result = await testDeviceConnection(payload);

    return { success: result.success, message: result.message };
  } catch (error) {
    console.error("Error en testDeviceConnectionAction:", error);
    return {
      success: false,
      message: t.forms.devices.backendConnectionError,
    };
  }
}

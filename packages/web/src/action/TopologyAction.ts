"use server";

import { revalidatePath } from "next/cache";
import {
  deleteTopology,
  getTopology,
  getTopologies,
  saveTopology,
  type Topology,
} from "@/service/TopologyService";
import { getServerDictionary } from "@/i18n/server";
import type { FormState } from "@/types/actions";

export type FormTopologyState = FormState<Topology | null>;

export type FormTopologyListState = FormState<Topology[]> & {
  page: number;
  limit: number;
  total: number;
};

export async function saveTopologyAction(
  name: string,
  description: string,
  topologyJson: string,
  id?: string,
): Promise<FormTopologyState> {
  const t = await getServerDictionary();
  const messages = t.forms.topology;

  try {
    if (!name?.trim()) {
      return { success: false, message: messages.nameRequired };
    }

    const result = await saveTopology({
      ...(id ? { id } : {}),
      name: name.trim(),
      description: description ?? null,
      topologyJson,
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/topology");
    return {
      success: true,
      message: result.message || messages.saved,
      data: result.data,
    };
  } catch (error) {
    console.error("Error al guardar la topología:", error);
    return {
      success: false,
      message: messages.requestError,
    };
  }
}

export async function getAllTopologiesAction(
  page: number = 1,
  limit: number = 10,
): Promise<FormTopologyListState> {
  const t = await getServerDictionary();
  const messages = t.forms.topology;

  try {
    const result = await getTopologies();

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message || t.forms.notAuthorized,
        data: [],
        page,
        limit,
        total: 0,
      };
    }

    const start = (page - 1) * limit;

    return {
      success: true,
      message: result.message,
      data: result.data.slice(start, start + limit),
      page,
      limit,
      total: result.data.length,
    };
  } catch (error) {
    console.error("Error al obtener las topologías:", error);
    return {
      success: false,
      message: messages.listFetchError,
      data: [],
      page,
      limit,
      total: 0,
    };
  }
}

export async function getTopologyByIdAction(
  id: string,
): Promise<FormTopologyState> {
  const t = await getServerDictionary();

  try {
    const result = await getTopology(id);

    if (!result.success) {
      return {
        success: false,
        message: result.message,
        data: null,
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  } catch (error) {
    console.error("Error al obtener topología:", error);
    return {
      success: false,
      message: t.forms.topology.fetchError,
      data: null,
    };
  }
}

export async function deleteTopologyAction(
  id: string,
): Promise<FormTopologyState> {
  const t = await getServerDictionary();

  try {
    const result = await deleteTopology(id);

    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath("/dashboard/topology");
    return {
      success: true,
      message: result.message || t.forms.topology.deleted,
    };
  } catch (error) {
    console.error("Error al eliminar topología:", error);
    return {
      success: false,
      message: t.forms.topology.deleteError,
    };
  }
}

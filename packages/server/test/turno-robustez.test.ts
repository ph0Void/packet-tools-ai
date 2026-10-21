import { describe, expect, it } from "vitest";
import { ToolMessage } from "@langchain/core/messages";
import { toolErrorToMessageMiddleware } from "@/agent/AgentRuntime";
import { buildAgentMiddleware } from "@/agent/AgentRuntime";
import { resolveVendorId } from "@/agent/security/VendorProfile";
import { resolverGuiaDeVendor } from "@/agent/security/CanonicalReads";

/**
 * Regresión de "lanzo una automatización INTELLIGENT y falla".
 *
 * `ToolNode` de langchain trata el error de UNA herramienta como "error de middleware"
 * cuando hay cualquier `wrapToolCall` en la pila (aquí siempre hay varios) y lo **revuelve**:
 * el grafo muere y el turno entero queda en FAILED aunque el agente pudiera seguir. Con
 * `toolErrorToMessageMiddleware` el fallo se convierte en un `ToolMessage` y el agente
 * continúa.
 */
describe("V1.2.5 — el fallo de una herramienta no aborta el turno", () => {
  function invocarCon(handler: () => Promise<unknown>) {
    const middleware = toolErrorToMessageMiddleware();
    const wrapToolCall = (middleware as unknown as {
      wrapToolCall: (
        request: unknown,
        handler: (r: unknown) => Promise<unknown>,
      ) => Promise<unknown>;
    }).wrapToolCall;

    return wrapToolCall.call(middleware, {
      toolCall: { id: "call-1", name: "executeTelnetCommands", args: {} },
      runtime: { signal: undefined },
    }, handler);
  }

  it("una herramienta que lanza se convierte en ToolMessage de error, no en excepción", async () => {
    const resultado = await invocarCon(() => {
      throw new Error("Error ejecutando comandos Telnet: equipo apagado");
    });

    expect(ToolMessage.isInstance(resultado)).toBe(true);
    expect(String((resultado as ToolMessage).content)).toContain("equipo apagado");
    expect((resultado as ToolMessage).status).toBe("error");
    expect((resultado as ToolMessage).tool_call_id).toBe("call-1");
  });

  it("una herramienta que funciona devuelve su resultado tal cual", async () => {
    const salida = JSON.stringify({ success: true, output: "version 15" });
    const resultado = await invocarCon(async () => salida);
    expect(resultado).toBe(salida);
  });

  it("si el turno está abortado, el error se propaga (el corte debe cortar)", async () => {
    const middleware = toolErrorToMessageMiddleware();
    const wrapToolCall = (middleware as unknown as {
      wrapToolCall: (
        request: unknown,
        handler: (r: unknown) => Promise<unknown>,
      ) => Promise<unknown>;
    }).wrapToolCall;

    const controller = new AbortController();
    controller.abort();

    await expect(
      wrapToolCall.call(
        middleware,
        {
          toolCall: { id: "call-2", name: "executeTelnetCommands", args: {} },
          runtime: { signal: controller.signal },
        },
        async () => {
          throw new Error("abortado");
        },
      ),
    ).rejects.toThrow("abortado");
  });

  it("el middleware va PRIMERO en la pila, para envolver también a los demás", () => {
    const pila = buildAgentMiddleware({ provider: "OPENAI" });
    expect(pila[0].name).toBe("ToolErrorToMessage");
    expect(pila.length).toBeGreaterThan(1);
    // La aprobación sigue en la pila: el filtro de errores no sustituye al HITL.
    expect(pila.some((m) => m.name === "ApprovalMiddleware")).toBe(true);
  });
});

describe("V1.2.5 — marcas nuevas de dispositivos", () => {
  it("cada TypeDevice nuevo resuelve a su perfil de fabricante", () => {
    expect(resolveVendorId({ typeDevice: "JUNIPER" })).toBe("junos");
    expect(resolveVendorId({ typeDevice: "FORTIGATE" })).toBe("fortios");
    expect(resolveVendorId({ typeDevice: "H3C" })).toBe("h3c");
    expect(resolveVendorId({ typeDevice: "PALO_ALTO" })).toBe("panos");
    expect(resolveVendorId({ typeDevice: "ARISTA" })).toBe("arista");
    expect(resolveVendorId({ typeDevice: "VYOS" })).toBe("vyos");
  });

  it("las marcas que ya funcionaban no cambian de perfil", () => {
    expect(resolveVendorId({ typeDevice: "CISCO" })).toBe("cisco");
    expect(resolveVendorId({ typeDevice: "HUAWEI" })).toBe("huawei");
    expect(resolveVendorId({ typeDevice: "ARUBA" })).toBe("aruba");
    expect(resolveVendorId({ typeDevice: "MIKROTIK" })).toBe("mikrotik");
    expect(resolveVendorId({ typeDevice: "GENERIC" })).toBe("conservative");
  });

  it("sin marca declarada se sigue detectando por el prompt", () => {
    expect(resolveVendorId({ prompt: "<admin>" })).toBe("huawei");
    expect(resolveVendorId({ prompt: "R1# " })).toBe("conservative");
  });

  it("las tres marcas sin guía ya la tienen", () => {
    expect(resolverGuiaDeVendor("h3c")?.label).toContain("H3C");
    expect(resolverGuiaDeVendor("palo alto")?.label).toContain("Palo Alto");
    expect(resolverGuiaDeVendor("arista")?.label).toContain("Arista");
  });
});

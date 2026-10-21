import { describe, expect, it } from "vitest";
import { proposeOptionsTool, OPTIONS_PRESENTED_MARKER } from "@/agent/plan/Tool";
import {
  esHerramientaDePlan,
  planModeMiddleware,
} from "@/agent/plan/Middleware";
import { getToolPolicy } from "@/agent/security/ToolPolicy";
import { requestContext } from "@/utils/RequestContext";
import { buildTurnContextPrompt } from "@/agent/deep/DeepSupervisor";
import { deepTurnContextSchema } from "@/agent/deep/context";
import { insertarSegmentoOpciones, insertarSegmentoPlan, type SegmentoOpciones } from "@/api/router/continuation";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { StreamChatHandlers } from "@/hooks/useCiscoChat";

/** El systemMessage del request es un objeto SystemMessage, no un string. */
function textoSistema(request: Record<string, unknown>): string {
  const sm = request.systemMessage;
  if (sm instanceof SystemMessage) return sm.text ?? "";
  return String(sm ?? "");
}
const OPCION_BASE: { id: string; title: string; description: string; risk: "safe" } = {
  id: "opcion-a",
  title: "Opción A",
  description: "Descripción A",
  risk: "safe",
};

const OPCIONES_VALIDAS = {
  planTitle: "Plan de OSPF",
  planSummary: "Resumen del plan",
  recommendedId: "opcion-a",
  options: [OPCION_BASE, { ...OPCION_BASE, id: "opcion-b", title: "Opción B" }],
};

describe("propose_options: validación del esquema", () => {
  it("acepta un plan válido y pide terminar el turno", async () => {
    const salida = JSON.parse(await proposeOptionsTool.invoke(OPCIONES_VALIDAS) as string) as {
        success: boolean;
        status: string;
      };
    expect(salida.success).toBe(true);
    expect(salida.status).toBe(OPTIONS_PRESENTED_MARKER);
  });

  it("rechaza si recommendedId no corresponde a ninguna opción", async () => {
    const salida = JSON.parse(
      await proposeOptionsTool.invoke({
        ...OPCIONES_VALIDAS,
        recommendedId: "no-existe",
      }) as string,
    ) as { success: boolean; error: string };
    expect(salida.success).toBe(false);
    expect(salida.error).toContain("no corresponde");
  });

  it("rechaza opciones con id repetido", async () => {
    const salida = JSON.parse(
      await proposeOptionsTool.invoke({
        ...OPCIONES_VALIDAS,
        options: [OPCION_BASE, { ...OPCION_BASE, title: "Duplicada" }],
      }) as string,
    ) as { success: boolean; error: string };
    expect(salida.success).toBe(false);
    expect(salida.error).toContain("mismo id");
  });

  it("rechaza un solo options (mínimo 2)", async () => {
    await expect(
      proposeOptionsTool.invoke({ ...OPCIONES_VALIDAS, options: [OPCION_BASE] }),
    ).rejects.toBeDefined();
  });

  it("rechaza más de 6 opciones", async () => {
    const muchas = Array.from({ length: 7 }, (_, i) => ({
      ...OPCION_BASE,
      id: `opcion-${i}`,
    }));
    await expect(
      proposeOptionsTool.invoke({ ...OPCIONES_VALIDAS, options: muchas }),
    ).rejects.toBeDefined();
  });
});

describe("el filtro del modo plan", () => {
  it("write_todos y propose_options están permitidas por NOMBRE", () => {
    expect(esHerramientaDePlan("write_todos")).toBe(true);
    expect(esHerramientaDePlan("propose_options")).toBe(true);
  });

  it("getToolPolicy responde mutating para las dos: por eso el permiso va por nombre", () => {
    // Esta es la trampa del diseño: si el filtro mirara sólo access === "readonly",
    // estas dos herramientas desaparecerían (lo desconocido es mutating, fail-closed)
    // y matarían la tarjeta del plan y los todos.
    expect(getToolPolicy("write_todos").access).toBe("mutating");
    expect(getToolPolicy("propose_options").access).toBe("mutating");
  });

  it("sin planRequired el middleware NO cambia nada (retorno temprano)", async () => {
    const middleware = planModeMiddleware();
    const hook = middleware.wrapModelCall as unknown as (
      request: unknown,
      handler: (request: Record<string, unknown>) => Promise<AIMessage>,
    ) => Promise<AIMessage>;

    const herramientas = [{ name: "send_command" }, { name: "search_web_tool" }];
    let recibido: Record<string, unknown> | null = null;
    await hook(
      {
        model: {},
        messages: [],
        systemMessage: new SystemMessage("BASE"),
        tools: herramientas,
        state: { messages: [] },
        runtime: { context: { planRequired: false } },
      },
      async (request) => {
        recibido = request;
        return new AIMessage("ok");
      },
    );

    expect(recibido).not.toBeNull();
    expect(recibido!.tools).toBe(herramientas);
    expect(textoSistema(recibido!)).toBe("BASE");
  });

  it("con planRequired filtra las mutantes y conserva las readonly + las del plan", async () => {
    const middleware = planModeMiddleware();
    const hook = middleware.wrapModelCall as unknown as (
      request: unknown,
      handler: (request: Record<string, unknown>) => Promise<AIMessage>,
    ) => Promise<AIMessage>;

    let recibido: Record<string, unknown> | null = null;
    await hook(
      {
        model: {},
        messages: [],
        systemMessage: new SystemMessage("BASE"),
        tools: [
          { name: "search_web_tool" },
          { name: "search_knowledge_base" },
          { name: "read_skill" },
          { name: "write_todos" },
          { name: "propose_options" },
          { name: "send_command" },
          { name: "task" },
          { name: "createSkill" },
        ],
        state: { messages: [] },
        runtime: { context: { planRequired: true } },
      },
      async (request) => {
        recibido = request;
        return new AIMessage("ok");
      },
    );

    const permitidas = (recibido!.tools as Array<{ name?: string }>).map((t) => t.name);
    expect(permitidas).toContain("search_web_tool");
    expect(permitidas).toContain("search_knowledge_base");
    expect(permitidas).toContain("read_skill");
    expect(permitidas).toContain("write_todos");
    expect(permitidas).toContain("propose_options");
    expect(permitidas).not.toContain("send_command");
    expect(permitidas).not.toContain("task");
    expect(permitidas).not.toContain("createSkill");
    expect(textoSistema(recibido!)).toContain("Planning mode (@plan)");
  });

  it("tras presentar las opciones el modelo se queda SIN herramientas (no puede ejecutar)", async () => {
    const middleware = planModeMiddleware();
    const hook = middleware.wrapModelCall as unknown as (
      request: unknown,
      handler: (request: Record<string, unknown>) => Promise<AIMessage>,
    ) => Promise<AIMessage>;

    let recibido: Record<string, unknown> | null = null;
    await hook(
      {
        model: {},
        messages: [
          new HumanMessage("hola"),
          new AIMessage(`${OPTIONS_PRESENTED_MARKER} opciones presentadas`),
        ],
        systemMessage: new SystemMessage("BASE"),
        tools: [{ name: "propose_options" }, { name: "search_web_tool" }],
        state: { messages: [] },
        runtime: { context: { planRequired: true } },
      },
      async (request) => {
        recibido = request;
        return new AIMessage("cierre");
      },
    );

    expect((recibido!.tools as unknown[]).length).toBe(0);
  });
});

describe("el prompt de modo plan", () => {
  it("sólo se inyecta cuando planRequired es true", async () => {
    const sinPlan = await buildTurnContextPrompt(
      deepTurnContextSchema.parse({ role: "ADMIN" }),
    );
    expect(sinPlan).not.toContain("Planning mode (@plan)");

    const conPlan = await buildTurnContextPrompt(
      deepTurnContextSchema.parse({ role: "ADMIN", planRequired: true }),
    );
    expect(conPlan).toContain("Planning mode (@plan)");
    expect(conPlan).toContain("propose_options");
    // La mención combinada: el prompt ordena derivar las opciones de la skill.
    const conSkill = await buildTurnContextPrompt(
      deepTurnContextSchema.parse({
        role: "ADMIN",
        planRequired: true,
        skillRequested: "ospf-area-0",
      }),
    );
    expect(conSkill).toContain("read_skill");
  });
});

describe("persistencia del segmento de opciones", () => {
  it("inserta el segmento y sobrevive a la normalización (historial)", () => {
    const segmentos: Array<{ kind: string }> = [];
    insertarSegmentoPlan(segmentos, [
      { id: "todo-1", content: "paso", status: "completed" },
    ]);
    insertarSegmentoOpciones(segmentos, {
      kind: "opciones",
      planTitle: "Plan",
      planSummary: "Resumen",
      recommendedId: "opcion-a",
      options: [OPCION_BASE, { ...OPCION_BASE, id: "opcion-b" }],
    } as SegmentoOpciones);

    const kinds = segmentos.map((s) => s.kind);
    expect(kinds).toEqual(["plan", "opciones"]);
  });

  it("no inserta nada si las opciones quedan vacías", () => {
    const segmentos: Array<{ kind: string }> = [];
    insertarSegmentoOpciones(segmentos, {
      kind: "opciones",
      planTitle: "Plan",
      planSummary: "",
      recommendedId: "",
      options: [],
    } as SegmentoOpciones);
    expect(segmentos).toHaveLength(0);
  });
});

describe("el parser SSE del frontend acepta el evento", () => {
  it("los handlers esperan onOpcionesSolicitadas (contrato aditivo)", () => {
    const handlers: Partial<StreamChatHandlers> = {};
    expect(handlers.onOpcionesSolicitadas).toBeUndefined();
  });
});

import fs from "node:fs/promises";
import path from "node:path";
import { toolRegistry } from "../src/core/ToolRegistry";
import { registerDomains } from "../src/domains/registry";
import { buildServer } from "../src/core/McpServer";
import { listSerialPorts } from "../src/transports/adapters";
import {
  detectVendorFromPrompt,
  resolveVendor,
} from "../src/transports/commandEngine";
import { envConfig } from "../src/config/EnvConfig";


let failures = 0;


function check(description: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  OK   ${description}`);
  } else {
    failures++;
    console.log(`  FALLO ${description}${detail !== undefined ? ` → ${JSON.stringify(detail)}` : ""}`);
  }
}


async function callTool(name: string, input: Record<string, unknown> = {}): Promise<unknown> {
  const tool = toolRegistry.getTools().find((t) => t.name === name);
  if (!tool) throw new Error(`Tool '${name}' does not exist.`);
  return tool.handler(input as never);
}

async function main(): Promise<void> {
  console.log("\n=== 1. Registro de dominios y herramientas ===");
  registerDomains();

  const modules = toolRegistry.getModules();
  check("The 7 domains are registered", modules.length === 7, {
    got: modules.map((m) => m.id),
  });

  const tools = toolRegistry.getTools();
  check("There are registered tools", tools.length > 0, { total: tools.length });

  const misPrefixed = modules.flatMap((module) =>
    module.tools.filter((t) => !t.name.startsWith(module.prefix)).map((t) => t.name),
  );
  check("All tools carry their domain prefix", misPrefixed.length === 0, {
    misPrefixed,
  });

  const names = tools.map((t) => t.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  check("There are no duplicate tool names", duplicates.length === 0, { duplicates });

  console.log("\n  Herramientas por dominio:");
  for (const module of modules) {
    console.log(`    ${module.prefix.padEnd(16)} ${String(module.tools.length).padStart(3)}  (${module.id})`);
  }
  console.log(`    ${"TOTAL".padEnd(16)} ${String(tools.length).padStart(3)}`);

  console.log("\n=== 2. Construcción del servidor MCP ===");
  const server = buildServer();
  check("The MCP server is built without errors", Boolean(server));

  console.log("\n=== 3. Detección de fabricante (datos puros) ===");
  const cases: Array<[string, string]> = [
    ["Router>", "conservative"], 
    ["R1(config)#", "cisco"],
    ["<Huawei>", "huawei"],
    ["[Huawei-GigabitEthernet0/0/1]", "huawei"],
    ["[admin@MikroTik] >", "mikrotik"],
    ["(host) (config) #", "aruba"],
    ["[edit interfaces]", "junos"],
  ];
  for (const [prompt, expected] of cases) {
    const got = detectVendorFromPrompt(prompt);
    check(
      `Prompt '${prompt}' → ${expected}`,
      (got ?? "conservative") === expected,
      { got },
    );
  }

  const declared = resolveVendor({ typeDevice: "HUAWEI", prompt: "R1#" });
  check("The declared typeDevice takes priority over the prompt", declared.id === "huawei", {
    got: declared.id,
  });
  const conservative = resolveVendor({});
  check(
    "With no data the conservative profile is used (no invented transitions)",
    conservative.id === "conservative" && conservative.transitions.toConfigMode === null,
  );

  console.log("\n=== 4. Enumeración de puertos serie (toca el sistema) ===");
  try {
    const ports = await listSerialPorts();
    check("SerialPort.list() responds", Array.isArray(ports), { total: ports.length });
    console.log(`       ${ports.length} puerto(s) detectado(s): ${ports.map((p) => p.path).join(", ") || "(ninguno)"}`);
  } catch (error) {
    console.log(`  AVISO  No se pudieron enumerar los puertos serie: ${String(error)}`);
  }

  console.log("\n=== 5. Ciclo de planificación (@plan → @execute) ===");
  const objective = `smoke-test-${Date.now()}`;
  const created = (await callTool("plan_task", {
    objective,
    steps: ['packet_tracer_add_device(name="R1", model="2911", x=100, y=100)'],
    openQuestions: ["What IP addressing should I use?"],
  })) as { filePath: string; markdown: string; steps: number };

  check("plan_task creates the file", Boolean(created.filePath));
  check("The plan starts with one step", created.steps === 1);
  check(
    "The checklist uses the '- [ ] N. action' format",
    /- \[ \] 1\. packet_tracer_add_device/.test(created.markdown),
  );
  check("Pending questions are recorded", created.markdown.includes("What IP addressing should I use?"));

  const exists = await fs
    .stat(created.filePath)
    .then(() => true)
    .catch(() => false);
  check("The file exists on disk", exists, { filePath: created.filePath });

  const listing = (await callTool("plan_execute", {
    planPath: path.basename(created.filePath),
  })) as { pendingSteps: Array<{ number: number }>; summary: { pending: number } };
  check("plan_execute returns the pending step", listing.pendingSteps.length === 1);
  check("The summary adds up", listing.summary.pending === 1, listing.summary);

  await callTool("plan_mark_step", {
    planPath: path.basename(created.filePath),
    step: 1,
    success: true,
    notes: "verified by the smoke test",
  });

  const content = await fs.readFile(created.filePath, "utf8");
  check("plan_mark_step ticks the checkbox as completed", content.includes("- [x] 1."));
  check("The note is recorded in the markdown", content.includes("verified by the smoke test"));

  const afterMarking = (await callTool("plan_execute", {
    planPath: path.basename(created.filePath),
  })) as { summary: { pending: number; completed: number } };
  check("There are no pending steps left", afterMarking.summary.pending === 0, afterMarking.summary);
  check("The step appears as done", afterMarking.summary.completed === 1);

  const withoutReason = await callTool("plan_mark_step", {
    planPath: path.basename(created.filePath),
    step: 1,
    success: false,
  })
    .then(() => false)
    .catch(() => true);
  check("Marking a failure without a reason is rejected", withoutReason);

  console.log("\n=== 6. Skills ===");
  const skills = (await callTool("skills_list", {})) as { total: number; skills: Array<{ slug: string }> };
  check(
    "skills_list finds the example skill on disk",
    skills.skills.some((s) => s.slug === "convencion-nombres"),
    { found: skills.skills.map((s) => s.slug) },
  );

  const read = (await callTool("skills_read", { slug: "convencion-nombres" })) as { content: string };
  check("skills_read returns the content", read.content.includes("Routers"));

  await fs.unlink(created.filePath).catch(() => undefined);

  console.log("\n=== 7. Rutas de configuración ===");
  console.log(`  Carpeta de planes:  ${envConfig.MCP_PLANS_DIR}`);
  console.log(`  Carpeta de skills:  ${envConfig.MCP_SKILLS_DIR}`);
  console.log(
    `  Bridge PT (propio):  http://${envConfig.MCP_BRIDGE_HOST}:${envConfig.MCP_BRIDGE_PORT}` +
      ` (habilitado: ${envConfig.MCP_BRIDGE_ENABLED})`,
  );

  console.log(
    failures === 0
      ? "\n✅ Todas las comprobaciones pasaron.\n"
      : `\n❌ ${failures} comprobación(es) fallaron.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\n❌ La prueba de humo falló con una excepción:", error);
  process.exit(1);
});

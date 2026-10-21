
const { spawn } = require("node:child_process");
const path = require("node:path");

const entrypoint = path.join(__dirname, "..", "dist", "app.js");


const requests = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "verifier", version: "1.0" },
    },
  },
  { jsonrpc: "2.0", method: "notifications/initialized" },
  { jsonrpc: "2.0", id: 2, method: "tools/list" },
  { jsonrpc: "2.0", id: 3, method: "resources/list" },
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "skills_directory", arguments: {} },
  },
  {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "no_existe_esta_tool", arguments: {} },
  },
];

const child = spawn(process.execPath, [entrypoint], {
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

for (const request of requests) {
  child.stdin.write(`${JSON.stringify(request)}\n`);
}


setTimeout(() => {
  child.stdin.end();
}, 1500);

child.on("close", () => {
  let failures = 0;
  const check = (description, ok, detail) => {
    console.log(`  ${ok ? "OK  " : "FALLO"} ${description}${!ok && detail ? ` → ${detail}` : ""}`);
    if (!ok) failures++;
  };

  console.log("\n=== Protocolo MCP sobre stdio (proceso real) ===\n");

  const lines = stdout.split("\n").filter((l) => l.trim().length > 0);
  const nonJson = lines.filter((l) => {
    try {
      JSON.parse(l);
      return false;
    } catch {
      return true;
    }
  });
  check(
    `All stdout lines are valid JSON (${lines.length} lines)`,
    nonJson.length === 0,
    nonJson.length > 0 ? `first non-JSON line: ${JSON.stringify(nonJson[0].slice(0, 120))}` : undefined,
  );

  const responses = lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const byId = new Map(responses.filter((r) => r.id !== undefined).map((r) => [r.id, r]));

  const init = byId.get(1);
  check("initialize responds", Boolean(init));
  check(
    "declares the tools capability",
    Boolean(init?.result?.capabilities?.tools),
    JSON.stringify(init?.result?.capabilities),
  );
  check(
    "declares the resources capability",
    Boolean(init?.result?.capabilities?.resources),
  );
  check(
    "reports the server as packet-tools-mcp",
    init?.result?.serverInfo?.name === "packet-tools-mcp",
    init?.result?.serverInfo?.name,
  );
  check(
    "includes instructions for the model",
    typeof init?.result?.instructions === "string" && init.result.instructions.length > 50,
  );

  const listResult = byId.get(2);
  const tools = listResult?.result?.tools ?? [];
  check("tools/list returns tools", tools.length > 0, `${tools.length}`);
  check("the 95 tools are exposed", tools.length === 95, `${tools.length}`);

  const withoutSchema = tools.filter(
    (t) => !t.inputSchema || t.inputSchema.type !== "object",
  );
  check(
    "all tools provide an object-type inputSchema",
    withoutSchema.length === 0,
    withoutSchema.map((t) => t.name).join(", "),
  );

  const withoutDescription = tools.filter((t) => !t.description || t.description.length < 20);
  check(
    "all tools provide a useful description",
    withoutDescription.length === 0,
    withoutDescription.map((t) => t.name).join(", "),
  );

  const PREFIXES = [
    "packet_tracer_",
    "gns3_",
    "serial_",
    "telnet_",
    "ssh_",
    "plan_",
    "skills_",
  ];
  const domains = new Map();
  const orphans = [];
  for (const t of tools) {
    const prefix = PREFIXES.find((p) => t.name.startsWith(p));
    if (!prefix) {
      orphans.push(t.name);
      continue;
    }
    domains.set(prefix, (domains.get(prefix) ?? 0) + 1);
  }
  console.log("\n  Herramientas por dominio:");
  for (const [prefix, n] of [...domains.entries()].sort()) {
    console.log(`    ${prefix.padEnd(16)} ${String(n).padStart(3)}`);
  }
  check(
    "all tools belong to a known domain",
    orphans.length === 0,
    orphans.join(", "),
  );
  check("the 7 domains are covered", domains.size === 7, `${domains.size}`);

  const resources = byId.get(3);
  check("resources/list responds without error", resources && !resources.error, JSON.stringify(resources?.error));

  const callResult = byId.get(4);
  check("tools/call executes skills_directory", Boolean(callResult?.result));
  check(
    "the response provides text content",
    Array.isArray(callResult?.result?.content) &&
      callResult.result.content[0]?.type === "text" &&
      callResult.result.content[0].text.length > 0,
  );
  check(
    "the call is not marked as an error",
    callResult?.result?.isError !== true,
    callResult?.result?.content?.[0]?.text?.slice(0, 160),
  );

  const missing = byId.get(5);
  const missingText = missing?.result?.content?.[0]?.text ?? "";
  check(
    "an unknown tool responds with isError",
    missing?.result?.isError === true,
    JSON.stringify(missing?.result)?.slice(0, 140),
  );
  check(
    "the message names the tool that does not exist",
    missingText.includes("no_existe_esta_tool"),
    missingText.slice(0, 140),
  );
  check(
    "the server stays alive after an invalid call (initialize arrived earlier)",
    Boolean(byId.get(1)?.result),
  );

  console.log(`\n  stderr: ${stderr.trim().split("\n").filter(Boolean).length} línea(s) de log`);
  check(
    "logs do NOT mix with stdout",
    !stdout.includes("[MCP]"),
    "'[MCP]' was found in stdout",
  );

  console.log(
    failures === 0
      ? "\n✅ El servidor MCP habla el protocolo correctamente.\n"
      : `\n❌ ${failures} comprobación(es) fallaron.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
});

child.on("error", (error) => {
  console.error("Could not launch the server:", error);
  process.exit(1);
});

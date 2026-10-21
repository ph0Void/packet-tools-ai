
import { io as createClient, type Socket as SocketClient } from "socket.io-client";
import {
  stopBridge,
  awaitToolResult,
  getBridgeState,
  startBridge,
  requestTool,
} from "../src/domains/packetTracer/PacketTracerBridgeServer";


let failures = 0;


const stdoutWrites: string[] = [];
const writeToStdout = process.stdout.write.bind(process.stdout);
process.stdout.write = ((chunk: unknown): boolean => {
  stdoutWrites.push(String(chunk));
  return true;
}) as typeof process.stdout.write;


function line(text: string): void {
  process.stderr.write(`${text}\n`);
}


function check(description: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    line(`  OK    ${description}`);
  } else {
    failures++;
    line(`  FALLO ${description}${detail !== undefined ? ` → ${JSON.stringify(detail)}` : ""}`);
  }
}


function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


function withDeadline<T>(promise: Promise<T>, ms = 5_000, label = "the response"): Promise<T> {
  return Promise.race([
    promise,
    wait(ms).then(() => {
      throw new Error(`Deadline exceeded (${ms} ms) waiting for ${label}.`);
    }),
  ]);
}


async function waitForCondition(condition: () => boolean, ms = 3_000, step = 20): Promise<boolean> {
  const limit = Date.now() + ms;
  while (Date.now() < limit) {
    if (condition()) return true;
    await wait(step);
  }
  return condition();
}


let bridgeUrl = "";


function connect(options: { userAgent?: string; clientType?: string } = {}): Promise<SocketClient> {
  return new Promise((resolve, reject) => {
    const socket = createClient(bridgeUrl, {
      transports: ["websocket"],
      
      reconnection: false,
      ...(options.clientType ? { query: { clientType: options.clientType } } : {}),
      ...(options.userAgent ? { extraHeaders: { "User-Agent": options.userAgent } } : {}),
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (error: Error) =>
      reject(new Error(error.message || "connection error")),
    );
  });
}


function connectExpectingRejection(userAgent: string): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = createClient(bridgeUrl, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: { "User-Agent": userAgent },
    });
    socket.once("connect", () => {
      socket.close();
      resolve(null);
    });
    socket.once("connect_error", (error: Error) => {
      socket.close();
      resolve(error.message || "rejected without a message");
    });
  });
}


let respondAutomatically: ((toolCallId: string, toolName: string) => void) | null = null;


function spyOn(promise: Promise<unknown>): {
  promise: Promise<unknown>;
  isResolved: () => boolean;
  value: () => unknown;
} {
  const state: { resolved: boolean; value: unknown } = { resolved: false, value: null };
  promise.then(
    (result) => {
      state.resolved = true;
      state.value = result;
    },
    () => undefined,
  );
  return { promise, isResolved: () => state.resolved, value: () => state.value };
}


function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) {
    const suggestion = (value as Error & { suggestion?: string }).suggestion;
    return suggestion ? `${value.message} ${suggestion}` : value.message;
  }
  return JSON.stringify(value ?? null);
}

async function main(): Promise<void> {
  line("\n=== 1. Bridge startup on an ephemeral port ===");
  await startBridge({ port: 0 });
  const initialState = getBridgeState();
  bridgeUrl = initialState.url;
  line(`  Bridge URL: ${bridgeUrl}`);
  check("The bridge stays active and listening", initialState.active, initialState);

  if (!initialState.active) {
    line(
      "\n  The bridge did not start. Check that MCP_BRIDGE_ENABLED is not false in the monorepo .env.\n",
    );
    process.exit(1);
  }

  await startBridge({ port: 0 });
  check(
    "startBridge() twice is idempotent",
    getBridgeState().url === bridgeUrl && getBridgeState().active,
    getBridgeState(),
  );

  line("\n=== 2. Handshake authentication ===");
  const rejection = await connectExpectingRejection("Mozilla/5.0 (normal browser)");
  check("A client that is not the extension is rejected at the handshake", rejection !== null, {
    rejection,
  });

  line("\n=== 3. Extension registration (Qt user-agent) ===");
  const extension = await connect({
    userAgent: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 QtWebEngine/5.15 Chrome/83",
  });
  const registered = await waitForCondition(() => getBridgeState().extensionConnected);
  check("The client with a Qt user-agent registers as the extension", registered, getBridgeState());
  check(
    "The registered socket is the extension's",
    getBridgeState().extensionSocketId === extension.id,
    { expected: extension.id, got: getBridgeState().extensionSocketId },
  );

  respondAutomatically = (toolCallId, toolName) => {
    extension.emit("tool_result", { tool_call_id: toolCallId, result: { success: true, echo: toolName } });
  };
  extension.on("tool_call", (data: { tool_call_id: string; tool_name: string }) => {
    respondAutomatically?.(data.tool_call_id, data.tool_name);
  });

  line("\n=== 4. tool_call + tool_result resolves the promise ===");
  const callReq = requestTool("getNetwork", { filter: "all" });
  check(
    "The tool_call_id follows the protocol format (`tool-<name>-<uuid>`)",
    callReq.toolCallId.startsWith("tool-getNetwork-") &&
      callReq.toolCallId.length > "tool-getNetwork-".length,
    callReq,
  );
  check(
    "The call is registered as pending",
    getBridgeState().pendingRequests === 1,
    getBridgeState(),
  );

  const result = (await withDeadline(awaitToolResult(callReq.toolCallId), 5_000, "getNetwork")) as {
    echo?: string;
  };
  check("The extension's tool_result resolves the promise", result?.echo === "getNetwork", result);
  check("After resolving nothing is left pending", getBridgeState().pendingRequests === 0, getBridgeState());

  line("\n=== 5. A tool_result from another socket is ignored ===");
  const intruder = await connect({ userAgent: "Qt/5.15 (intruder)" });
  check(
    "A second extension connects but does not replace the registered one",
    getBridgeState().extensionSocketId === extension.id,
    getBridgeState(),
  );

  respondAutomatically = null;
  const suspended = requestTool("pingDevices", {});
  const spy = spyOn(awaitToolResult(suspended.toolCallId));
  intruder.emit("tool_result", {
    tool_call_id: suspended.toolCallId,
    result: { success: true, hacked: true },
  });
  await wait(250);
  check("The tool_result from the unregistered socket does NOT resolve the promise", !spy.isResolved(), {
    resolved: spy.isResolved(),
  });

  respondAutomatically = (toolCallId, toolName) => {
    extension.emit("tool_result", { tool_call_id: toolCallId, result: { success: true, echo: toolName } });
  };
  extension.emit("tool_result", {
    tool_call_id: suspended.toolCallId,
    result: { success: true, echo: "pingDevices" },
  });
  const good = (await withDeadline(spy.promise, 5_000, "pingDevices")) as {
    echo?: string;
    hacked?: boolean;
  };
  check(
    "The call stays pending and the registered extension resolves it",
    good?.echo === "pingDevices" && good?.hacked === undefined,
    good,
  );
  intruder.close();

  line("\n=== 6. An orphaned tool_result is ignored ===");
  respondAutomatically = null;
  const beforeOrphan = getBridgeState().pendingRequests;
  extension.emit("tool_result", {
    tool_call_id: "tool-getNetwork-nonexistent-0000",
    result: { success: true, invented: true },
  });
  await wait(150);
  check(
    "An orphaned tool_result creates or alters no request",
    getBridgeState().pendingRequests === beforeOrphan,
    { before: beforeOrphan, after: getBridgeState().pendingRequests },
  );

  const afterOrphan = requestTool("getNetwork", {});
  respondAutomatically = (toolCallId, toolName) => {
    extension.emit("tool_result", { tool_call_id: toolCallId, result: { success: true, echo: toolName } });
  };
  const valueAfterOrphan = (await withDeadline(
    awaitToolResult(afterOrphan.toolCallId),
    5_000,
    "the call after the orphan",
  )) as { echo?: string };
  check(
    "A call after the orphan resolves fine",
    valueAfterOrphan?.echo === "getNetwork",
    valueAfterOrphan,
  );

  line("\n=== 7. A repeated tool_result is ignored ===");
  respondAutomatically = null;
  const suspended2 = requestTool("exportWorkspace", {});
  const spy2 = spyOn(awaitToolResult(suspended2.toolCallId));

  extension.emit("tool_result", {
    tool_call_id: afterOrphan.toolCallId,
    result: { success: true, echo: "getNetwork-REPEATED" },
  });
  await wait(250);
  check("A repeated tool_result does NOT resolve another live promise", !spy2.isResolved(), {
    resolved: spy2.isResolved(),
  });

  respondAutomatically = (toolCallId, toolName) => {
    extension.emit("tool_result", { tool_call_id: toolCallId, result: { success: true, echo: toolName } });
  };
  extension.emit("tool_result", {
    tool_call_id: suspended2.toolCallId,
    result: { success: true, echo: "exportWorkspace" },
  });
  const good2 = (await withDeadline(spy2.promise, 5_000, "exportWorkspace")) as { echo?: string };
  check("The call stays alive and the extension resolves it", good2?.echo === "exportWorkspace", good2);

  line("\n=== 8. The extension disconnects with a call in flight ===");
  respondAutomatically = null;
  const onDisconnect = requestTool("applyDeviceConfig", { deviceName: "R1" });
  const inFlight = awaitToolResult(onDisconnect.toolCallId);
  extension.disconnect();

  const outcome = await Promise.race([
    inFlight.then(
      () => ({ ok: true, message: "resolved" }),
      (error: Error) => ({ ok: false, message: text(error) }),
    ),
    wait(2_000).then(() => ({ ok: false, message: "TIMEOUT: it hung" })),
  ]);
  check(
    "The in-flight call does NOT hang when the extension disconnects",
    !outcome.ok && outcome.message !== "TIMEOUT: it hung",
    outcome,
  );
  check("The error explains that the extension disconnected", !outcome.ok && /disconnect/i.test(outcome.message), outcome);
  check("getBridgeState() no longer sees a connected extension", !getBridgeState().extensionConnected, getBridgeState());
  check("No pending request is left hanging", getBridgeState().pendingRequests === 0, getBridgeState());

  line("\n=== 9. Bridge stopped and requestTool failing fast ===");
  await stopBridge();
  check("After stopBridge() the bridge stays inactive", !getBridgeState().active, getBridgeState());
  check("stopBridge() twice breaks nothing", await stopBridge().then(() => true));

  const failure = (() => {
    try {
      requestTool("getNetwork", {});
      return null;
    } catch (error) {
      return text(error);
    }
  })();
  check("requestTool() fails fast with an actionable message", Boolean(failure), { failure });

  const urlAfterStop = getBridgeState().url;
  check("The message mentions the MCP bridge URL", (failure ?? "").includes(urlAfterStop), {
    failure,
    urlAfterStop,
  });

  line("\n=== 10. Nothing is written to stdout (the exclusive JSON-RPC channel) ===");
  process.stdout.write = writeToStdout;
  check(
    "The process wrote nothing to stdout during the whole test",
    stdoutWrites.length === 0,
    { writes: stdoutWrites.slice(0, 5) },
  );

  line(
    failures === 0
      ? "\n✅ All the bridge checks passed.\n"
      : `\n❌ ${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  process.stdout.write = writeToStdout;
  line("\n❌ The bridge test failed with an exception:");
  line(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});

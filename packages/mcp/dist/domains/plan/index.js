"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planModule = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const ToolRegistry_1 = require("../../core/ToolRegistry.js");
const EnvConfig_1 = require("../../config/EnvConfig.js");
const PrismaClient_1 = require("../../prisma/lib/PrismaClient.js");
const Logger_1 = require("../../utils/Logger.js");
const errors_1 = require("../../core/errors.js");
async function ensurePlansFolder() {
    await promises_1.default.mkdir(EnvConfig_1.envConfig.MCP_PLANS_DIR, { recursive: true });
    return EnvConfig_1.envConfig.MCP_PLANS_DIR;
}
function objectiveSlug(objective) {
    const clean = objective
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
    return clean || "plan";
}
function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
function resolvePlanPath(requestedPath) {
    const absolutePath = node_path_1.default.isAbsolute(requestedPath)
        ? requestedPath
        : node_path_1.default.join(EnvConfig_1.envConfig.MCP_PLANS_DIR, node_path_1.default.basename(requestedPath));
    const plansRoot = node_path_1.default.resolve(EnvConfig_1.envConfig.MCP_PLANS_DIR);
    const resolvedPath = node_path_1.default.resolve(absolutePath);
    if (resolvedPath !== plansRoot && !resolvedPath.startsWith(plansRoot + node_path_1.default.sep)) {
        throw (0, errors_1.validationError)(`The path '${requestedPath}' is outside the plans folder.`, `Only plans from '${EnvConfig_1.envConfig.MCP_PLANS_DIR}' can be executed. Use the file name (for example 'plan-2026-01-01.md') or call plan_list without arguments to see the latest one.`);
    }
    return resolvedPath;
}
function parseChecklist(content) {
    const steps = [];
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const match = /^\s*-\s*\[([ x!X])\]\s*(\d+)\.\s*(.+)$/.exec(line);
        if (!match)
            continue;
        const mark = match[1].toLowerCase();
        const status = mark === "x" ? "done" : mark === "!" ? "failed" : "pending";
        let text = match[3].trim();
        let error;
        const errorSeparator = text.lastIndexOf(" — error:");
        if (errorSeparator !== -1) {
            error = text.slice(errorSeparator + " — error:".length).trim();
            text = text.slice(0, errorSeparator).trim();
        }
        steps.push({
            number: Number(match[2]),
            status,
            text,
            error,
            originalLine: line,
        });
    }
    return steps;
}
async function readPlan(filePath) {
    try {
        return await promises_1.default.readFile(filePath, "utf8");
    }
    catch {
        throw new errors_1.McpToolError("NOT_FOUND", `The plan file '${filePath}' does not exist.`, {
            suggestion: "Call plan_list to see the available plans, or create a new one with plan_task.",
        });
    }
}
async function mostRecentPlan() {
    const folder = await ensurePlansFolder();
    const files = (await promises_1.default.readdir(folder))
        .filter((name) => name.endsWith(".md"))
        .sort()
        .reverse();
    if (files.length === 0) {
        throw new errors_1.McpToolError("NOT_FOUND", "There is no plan saved yet.", {
            suggestion: "Create one with plan_task indicating the objective (for example 'topology with 2 routers and 3 PCs running OSPF').",
        });
    }
    const filePath = node_path_1.default.join(folder, files[0]);
    return { filePath, content: await promises_1.default.readFile(filePath, "utf8") };
}
const tools = [
    (0, ToolRegistry_1.defineTool)({
        name: "plan_task",
        description: "PLANNING MODE. Executes nothing: it reasons and writes a markdown plan with a checklist of the steps to follow " +
            "and saves it to disk. Use it when the user types '@plan <objective>' or asks for something multi-step that is worth agreeing on first. " +
            "RULES: if critical information is missing (device models, IP addressing, names, routing protocol) do NOT invent it: " +
            "ask the user BEFORE closing the plan. If you spot something ambiguous or destructive (deleting the workspace, overwriting a configuration) " +
            "flag it explicitly as a risk in the plan. " +
            "Pass in 'steps' the ordered list of steps; each step must be a concrete tool call with its parameters.",
        inputSchema: {
            objective: zod_1.z.string().describe("Objective exactly as the user requested it"),
            steps: zod_1.z
                .array(zod_1.z.string())
                .min(1)
                .describe("Ordered steps. Each one must be a concrete call, for example: \"packet_tracer_add_device(name=\\\"R1\\\", model=\\\"2911\\\", x=100, y=100)\""),
            openQuestions: zod_1.z
                .array(zod_1.z.string())
                .optional()
                .describe("Questions to resolve with the user before executing"),
            risks: zod_1.z
                .array(zod_1.z.string())
                .optional()
                .describe("Risks or destructive actions detected (deletions, overwrites...)"),
        },
        handler: async ({ objective, steps, openQuestions, risks }) => {
            const folder = await ensurePlansFolder();
            const filename = `plan-${timestamp()}-${objectiveSlug(objective)}.md`;
            const filePath = node_path_1.default.join(folder, filename);
            const markdown = buildPlanMarkdown({
                objective,
                steps,
                openQuestions: openQuestions ?? [],
                risks: risks ?? [],
                filename,
            });
            await promises_1.default.writeFile(filePath, markdown, "utf8");
            const record = await PrismaClient_1.prismaClient.planRecordMcp.create({
                data: {
                    objective,
                    filePath: filename,
                    status: "PENDING",
                    totalSteps: steps.length,
                },
            });
            Logger_1.Logger.info(`Plan created: ${filename} (${steps.length} steps).`);
            return {
                success: true,
                planId: record.id,
                filePath,
                steps: steps.length,
                pendingConfirmation: (openQuestions?.length ?? 0) > 0,
                markdown,
                message: (openQuestions?.length ?? 0) > 0
                    ? "Plan saved, but there are unresolved questions: ASK the user before moving on to execution. When they answer, call plan_task again with the complete plan."
                    : "Plan saved. Show it to the user and wait for their confirmation before executing it with plan_execute.",
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "plan_execute",
        description: "EXECUTION MODE. Reads a saved plan and returns its PENDING steps in order, so you can execute them by calling the corresponding tools. " +
            "Use it when the user types '@execute'. Without arguments it uses the most recent plan of the session. " +
            "IMPORTANT: after each step, call plan_mark_step with the result. If a step FAILS, stop and ask the user whether to retry, " +
            "skip the step or abort: never loop the same command without changing anything. " +
            "This does NOT execute the tools by itself: it is the server handing you the script and the real state of the plan.",
        inputSchema: {
            planPath: zod_1.z
                .string()
                .optional()
                .describe("Name or path of the plan to execute; omit it to use the most recent one"),
        },
        handler: async ({ planPath }) => {
            const { filePath, content } = planPath
                ? { filePath: resolvePlanPath(planPath), content: await readPlan(resolvePlanPath(planPath)) }
                : await mostRecentPlan();
            const steps = parseChecklist(content);
            if (steps.length === 0) {
                return {
                    success: false,
                    filePath,
                    error: "The plan contains no recognizable step. Lines in the format '- [ ] 1. action' are expected.",
                    suggestion: "Create the plan with plan_task, which generates that format automatically.",
                };
            }
            const pending = steps.filter((step) => step.status === "pending");
            const failed = steps.filter((step) => step.status === "failed");
            const done = steps.filter((step) => step.status === "done");
            if (pending.length > 0) {
                await PrismaClient_1.prismaClient.planRecordMcp
                    .updateMany({
                    where: { filePath: node_path_1.default.basename(filePath) },
                    data: {
                        status: pending.length === steps.length ? "RUNNING" : "RUNNING",
                        completedSteps: done.length,
                        failedSteps: failed.length,
                    },
                })
                    .catch(() => undefined);
            }
            return {
                success: true,
                filePath,
                planPath: node_path_1.default.basename(filePath),
                summary: {
                    total: steps.length,
                    completed: done.length,
                    failed: failed.length,
                    pending: pending.length,
                },
                pendingSteps: pending.map((step) => ({
                    number: step.number,
                    action: step.text,
                })),
                ...(failed.length > 0
                    ? {
                        failedSteps: failed.map((step) => ({
                            number: step.number,
                            action: step.text,
                            error: step.error ?? "(no detail)",
                        })),
                        warning: "There are steps that failed in a previous run. Ask the user whether to retry, skip them or abort before continuing.",
                    }
                    : {}),
                instructions: pending.length === 0
                    ? "There are no pending steps left: the plan is finished. Check the real state with the read tools before considering the job done."
                    : "Execute the PENDING steps in order. After each one, call plan_mark_step indicating the step number and whether it succeeded. " +
                        "If a step fails, STOP and ask the user: do not retry the same command without changing anything.",
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "plan_mark_step",
        description: "Marks a plan step as completed or failed, rewriting the checklist in the same markdown file. " +
            "Leaves an auditable record of what was done. Call it after EACH step of plan_execute.",
        inputSchema: {
            planPath: zod_1.z.string().describe("Plan name (the 'planPath' field returned by plan_execute)"),
            step: zod_1.z.number().int().positive().describe("Step number, as it appears in the plan"),
            success: zod_1.z.boolean().describe("true if the step went well; false if it failed"),
            error: zod_1.z.string().optional().describe("Error message, required when success is false"),
            notes: zod_1.z.string().optional().describe("Additional note appended to the step"),
        },
        handler: async ({ planPath, step, success, error, notes }) => {
            const filePath = resolvePlanPath(planPath);
            let content = await readPlan(filePath);
            const steps = parseChecklist(content);
            const targetStep = steps.find((planStep) => planStep.number === step);
            if (!targetStep) {
                throw new errors_1.McpToolError("NOT_FOUND", `The plan has no step with number ${step}.`, {
                    suggestion: `The steps of the plan are: ${steps.map((planStep) => planStep.number).join(", ")}. Use one of those numbers.`,
                });
            }
            if (!success && !error?.trim()) {
                throw (0, errors_1.validationError)("The step was marked as failed but no error message was provided.", "Repeat the call with the 'error' parameter explaining what failed: that is what stays recorded in the plan.");
            }
            const mark = success ? "x" : "!";
            const suffix = [
                error?.trim() ? ` — error: ${error.trim()}` : "",
                notes?.trim() ? ` — note: ${notes.trim()}` : "",
            ].join("");
            const newLine = `- [${mark}] ${step}. ${targetStep.text}${suffix}`;
            content = content
                .split(/\r?\n/)
                .map((line) => {
                const match = /^\s*-\s*\[[ x!X]\]\s*(\d+)\./.exec(line);
                return match && Number(match[1]) === step ? newLine : line;
            })
                .join("\n");
            await promises_1.default.writeFile(filePath, content, "utf8");
            const updated = parseChecklist(content);
            const done = updated.filter((planStep) => planStep.status === "done").length;
            const failed = updated.filter((planStep) => planStep.status === "failed").length;
            const pending = updated.filter((planStep) => planStep.status === "pending").length;
            const allDone = pending === 0 && failed === 0;
            const hasFailure = failed > 0;
            await PrismaClient_1.prismaClient.planRecordMcp
                .updateMany({
                where: { filePath: node_path_1.default.basename(filePath) },
                data: {
                    status: allDone ? "DONE" : hasFailure ? "FAILED" : "RUNNING",
                    completedSteps: done,
                    failedSteps: failed,
                    lastError: error?.trim() || null,
                },
            })
                .catch(() => undefined);
            return {
                success: true,
                filePath,
                step,
                status: success ? "done" : "failed",
                progress: { total: updated.length, completed: done, failed, pending },
                message: allDone
                    ? "All the steps of the plan are completed."
                    : hasFailure
                        ? "There are failed steps in the plan. Ask the user whether to retry, skip or abort."
                        : `${pending} step(s) still pending: continue with the next one.`,
            };
        },
    }),
    (0, ToolRegistry_1.defineTool)({
        name: "plan_list",
        description: "Lists the saved plans and their steps. Without arguments it returns the most recent plan with its checklist; " +
            "with 'all' in true, the summary of all of them. Use it to resume a previous plan or to show the state to the user.",
        inputSchema: {
            all: zod_1.z.boolean().optional().describe("true to return the summary of every plan, not just the last one"),
            planPath: zod_1.z.string().optional().describe("Name of a specific plan to show"),
        },
        handler: async ({ all, planPath }) => {
            if (planPath) {
                const filePath = resolvePlanPath(planPath);
                const content = await readPlan(filePath);
                return {
                    success: true,
                    filePath,
                    steps: parseChecklist(content).map((planStep) => ({
                        number: planStep.number,
                        status: planStep.status,
                        action: planStep.text,
                        ...(planStep.error ? { error: planStep.error } : {}),
                    })),
                    markdown: content,
                };
            }
            const folder = await ensurePlansFolder();
            if (all) {
                const files = (await promises_1.default.readdir(folder)).filter((n) => n.endsWith(".md")).sort().reverse();
                const summaries = await Promise.all(files.map(async (name) => {
                    const content = await promises_1.default.readFile(node_path_1.default.join(folder, name), "utf8");
                    const steps = parseChecklist(content);
                    return {
                        filePath: name,
                        total: steps.length,
                        completed: steps.filter((planStep) => planStep.status === "done").length,
                        failed: steps.filter((planStep) => planStep.status === "failed").length,
                        pending: steps.filter((planStep) => planStep.status === "pending").length,
                    };
                }));
                return { success: true, total: summaries.length, plans: summaries };
            }
            const { filePath, content } = await mostRecentPlan();
            return {
                success: true,
                filePath,
                steps: parseChecklist(content).map((planStep) => ({
                    number: planStep.number,
                    status: planStep.status,
                    action: planStep.text,
                    ...(planStep.error ? { error: planStep.error } : {}),
                })),
                markdown: content,
            };
        },
    }),
];
function buildPlanMarkdown(args) {
    const lines = [];
    lines.push(`# Plan: ${args.objective}`);
    lines.push("");
    lines.push(`- **File**: \`${args.filename}\``);
    lines.push(`- **Created**: ${new Date().toISOString()}`);
    lines.push(`- **Steps**: ${args.steps.length}`);
    lines.push("");
    if (args.openQuestions.length > 0) {
        lines.push("## Open questions (ANSWER BEFORE EXECUTING)");
        lines.push("");
        lines.push("> There is critical information unresolved. Do not execute the plan until the user answers.");
        lines.push("");
        for (const question of args.openQuestions) {
            lines.push(`- ${question}`);
        }
        lines.push("");
    }
    if (args.risks.length > 0) {
        lines.push("## Detected risks");
        lines.push("");
        lines.push("> These actions are destructive or ambiguous. Confirm them with the user.");
        lines.push("");
        for (const risk of args.risks) {
            lines.push(`- ⚠️ ${risk}`);
        }
        lines.push("");
    }
    lines.push("## Steps");
    lines.push("");
    args.steps.forEach((planStep, index) => {
        lines.push(`- [ ] ${index + 1}. ${planStep}`);
    });
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("_The checkboxes are ticked by `plan_mark_step`: `[x]` completed, `[!]` failed with its error._");
    lines.push("");
    return lines.join("\n");
}
exports.planModule = {
    id: "plan",
    prefix: "plan_",
    description: "Planning and execution of multi-step tasks: create a markdown plan with a checklist, execute it step by step and keep an auditable record.",
    tools,
};
//# sourceMappingURL=index.js.map
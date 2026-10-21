
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { defineTool } from "@/core/ToolRegistry";
import type { DomainModule, AnyToolDefinition } from "@/core/ToolRegistry";
import { envConfig } from "@/config/EnvConfig";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import { Logger } from "@/utils/Logger";
import { McpToolError, validationError } from "@/core/errors";


type StepStatus = "pending" | "done" | "failed";


interface PlanStep {
  number: number;
  status: StepStatus;
  text: string;
  error?: string;
  originalLine: string;
}


async function ensurePlansFolder(): Promise<string> {
  await fs.mkdir(envConfig.MCP_PLANS_DIR, { recursive: true });
  return envConfig.MCP_PLANS_DIR;
}


function objectiveSlug(objective: string): string {
  const clean = objective
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return clean || "plan";
}


function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}


function resolvePlanPath(requestedPath: string): string {
  const absolutePath = path.isAbsolute(requestedPath)
    ? requestedPath
    : path.join(envConfig.MCP_PLANS_DIR, path.basename(requestedPath));
  const plansRoot = path.resolve(envConfig.MCP_PLANS_DIR);
  const resolvedPath = path.resolve(absolutePath);

  if (resolvedPath !== plansRoot && !resolvedPath.startsWith(plansRoot + path.sep)) {
    throw validationError(
      `The path '${requestedPath}' is outside the plans folder.`,
      `Only plans from '${envConfig.MCP_PLANS_DIR}' can be executed. Use the file name (for example 'plan-2026-01-01.md') or call plan_list without arguments to see the latest one.`,
    );
  }

  return resolvedPath;
}


function parseChecklist(content: string): PlanStep[] {
  const steps: PlanStep[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const match = /^\s*-\s*\[([ x!X])\]\s*(\d+)\.\s*(.+)$/.exec(line);
    if (!match) continue;

    const mark = match[1].toLowerCase();
    const status: StepStatus = mark === "x" ? "done" : mark === "!" ? "failed" : "pending";
    let text = match[3].trim();
    let error: string | undefined;

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


async function readPlan(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    throw new McpToolError("NOT_FOUND", `The plan file '${filePath}' does not exist.`, {
      suggestion:
        "Call plan_list to see the available plans, or create a new one with plan_task.",
    });
  }
}


async function mostRecentPlan(): Promise<{ filePath: string; content: string }> {
  const folder = await ensurePlansFolder();
  const files = (await fs.readdir(folder))
    .filter((name) => name.endsWith(".md"))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new McpToolError("NOT_FOUND", "There is no plan saved yet.", {
      suggestion:
        "Create one with plan_task indicating the objective (for example 'topology with 2 routers and 3 PCs running OSPF').",
    });
  }

  const filePath = path.join(folder, files[0]);

  return { filePath, content: await fs.readFile(filePath, "utf8") };
}




const tools: AnyToolDefinition[] = [
  defineTool({
    name: "plan_task",
    description:
      "PLANNING MODE. Executes nothing: it reasons and writes a markdown plan with a checklist of the steps to follow " +
      "and saves it to disk. Use it when the user types '@plan <objective>' or asks for something multi-step that is worth agreeing on first. " +
      "RULES: if critical information is missing (device models, IP addressing, names, routing protocol) do NOT invent it: " +
      "ask the user BEFORE closing the plan. If you spot something ambiguous or destructive (deleting the workspace, overwriting a configuration) " +
      "flag it explicitly as a risk in the plan. " +
      "Pass in 'steps' the ordered list of steps; each step must be a concrete tool call with its parameters.",
    inputSchema: {
      objective: z.string().describe("Objective exactly as the user requested it"),
      steps: z
        .array(z.string())
        .min(1)
        .describe(
          "Ordered steps. Each one must be a concrete call, for example: \"packet_tracer_add_device(name=\\\"R1\\\", model=\\\"2911\\\", x=100, y=100)\"",
        ),
      openQuestions: z
        .array(z.string())
        .optional()
        .describe("Questions to resolve with the user before executing"),
      risks: z
        .array(z.string())
        .optional()
        .describe("Risks or destructive actions detected (deletions, overwrites...)"),
    },
    handler: async ({ objective, steps, openQuestions, risks }) => {
      const folder = await ensurePlansFolder();
      const filename = `plan-${timestamp()}-${objectiveSlug(objective)}.md`;
      const filePath = path.join(folder, filename);
      const markdown = buildPlanMarkdown({
        objective,
        steps,
        openQuestions: openQuestions ?? [],
        risks: risks ?? [],
        filename,
      });

      await fs.writeFile(filePath, markdown, "utf8");

      const record = await prismaClient.planRecordMcp.create({
        data: {
          objective,
          filePath: filename,
          status: "PENDING",
          totalSteps: steps.length,
        },
      });

      Logger.info(`Plan created: ${filename} (${steps.length} steps).`);

      return {
        success: true,
        planId: record.id,
        filePath,
        steps: steps.length,
        pendingConfirmation: (openQuestions?.length ?? 0) > 0,
        markdown,
        message:
          (openQuestions?.length ?? 0) > 0
            ? "Plan saved, but there are unresolved questions: ASK the user before moving on to execution. When they answer, call plan_task again with the complete plan."
            : "Plan saved. Show it to the user and wait for their confirmation before executing it with plan_execute.",
      };
    },
  }),
  defineTool({
    name: "plan_execute",
    description:
      "EXECUTION MODE. Reads a saved plan and returns its PENDING steps in order, so you can execute them by calling the corresponding tools. " +
      "Use it when the user types '@execute'. Without arguments it uses the most recent plan of the session. " +
      "IMPORTANT: after each step, call plan_mark_step with the result. If a step FAILS, stop and ask the user whether to retry, " +
      "skip the step or abort: never loop the same command without changing anything. " +
      "This does NOT execute the tools by itself: it is the server handing you the script and the real state of the plan.",
    inputSchema: {
      planPath: z
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
          error:
            "The plan contains no recognizable step. Lines in the format '- [ ] 1. action' are expected.",
          suggestion: "Create the plan with plan_task, which generates that format automatically.",
        };
      }

      const pending = steps.filter((step) => step.status === "pending");
      const failed = steps.filter((step) => step.status === "failed");
      const done = steps.filter((step) => step.status === "done");

      if (pending.length > 0) {
        await prismaClient.planRecordMcp
          .updateMany({
            where: { filePath: path.basename(filePath) },
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
        planPath: path.basename(filePath),
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
              warning:
                "There are steps that failed in a previous run. Ask the user whether to retry, skip them or abort before continuing.",
            }
          : {}),
        instructions:
          pending.length === 0
            ? "There are no pending steps left: the plan is finished. Check the real state with the read tools before considering the job done."
            : "Execute the PENDING steps in order. After each one, call plan_mark_step indicating the step number and whether it succeeded. " +
              "If a step fails, STOP and ask the user: do not retry the same command without changing anything.",
      };
    },
  }),
  defineTool({
    name: "plan_mark_step",
    description:
      "Marks a plan step as completed or failed, rewriting the checklist in the same markdown file. " +
      "Leaves an auditable record of what was done. Call it after EACH step of plan_execute.",
    inputSchema: {
      planPath: z.string().describe("Plan name (the 'planPath' field returned by plan_execute)"),
      step: z.number().int().positive().describe("Step number, as it appears in the plan"),
      success: z.boolean().describe("true if the step went well; false if it failed"),
      error: z.string().optional().describe("Error message, required when success is false"),
      notes: z.string().optional().describe("Additional note appended to the step"),
    },
    handler: async ({ planPath, step, success, error, notes }) => {
      const filePath = resolvePlanPath(planPath);
      let content = await readPlan(filePath);
      const steps = parseChecklist(content);
      const targetStep = steps.find((planStep) => planStep.number === step);

      if (!targetStep) {
        throw new McpToolError(
          "NOT_FOUND",
          `The plan has no step with number ${step}.`,
          {
            suggestion: `The steps of the plan are: ${steps.map((planStep) => planStep.number).join(", ")}. Use one of those numbers.`,
          },
        );
      }

      if (!success && !error?.trim()) {
        throw validationError(
          "The step was marked as failed but no error message was provided.",
          "Repeat the call with the 'error' parameter explaining what failed: that is what stays recorded in the plan.",
        );
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

      await fs.writeFile(filePath, content, "utf8");

      const updated = parseChecklist(content);
      const done = updated.filter((planStep) => planStep.status === "done").length;
      const failed = updated.filter((planStep) => planStep.status === "failed").length;
      const pending = updated.filter((planStep) => planStep.status === "pending").length;
      const allDone = pending === 0 && failed === 0;
      const hasFailure = failed > 0;

      await prismaClient.planRecordMcp
        .updateMany({
          where: { filePath: path.basename(filePath) },
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
  defineTool({
    name: "plan_list",
    description:
      "Lists the saved plans and their steps. Without arguments it returns the most recent plan with its checklist; " +
      "with 'all' in true, the summary of all of them. Use it to resume a previous plan or to show the state to the user.",
    inputSchema: {
      all: z.boolean().optional().describe("true to return the summary of every plan, not just the last one"),
      planPath: z.string().optional().describe("Name of a specific plan to show"),
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
        const files = (await fs.readdir(folder)).filter((n) => n.endsWith(".md")).sort().reverse();
        const summaries = await Promise.all(
          files.map(async (name) => {
            const content = await fs.readFile(path.join(folder, name), "utf8");
            const steps = parseChecklist(content);

            return {
              filePath: name,
              total: steps.length,
              completed: steps.filter((planStep) => planStep.status === "done").length,
              failed: steps.filter((planStep) => planStep.status === "failed").length,
              pending: steps.filter((planStep) => planStep.status === "pending").length,
            };
          }),
        );

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


function buildPlanMarkdown(args: {
  objective: string;
  steps: string[];
  openQuestions: string[];
  risks: string[];
  filename: string;
}): string {
  const lines: string[] = [];

  lines.push(`# Plan: ${args.objective}`);
  lines.push("");
  lines.push(`- **File**: \`${args.filename}\``);
  lines.push(`- **Created**: ${new Date().toISOString()}`);
  lines.push(`- **Steps**: ${args.steps.length}`);
  lines.push("");

  if (args.openQuestions.length > 0) {
    lines.push("## Open questions (ANSWER BEFORE EXECUTING)");
    lines.push("");
    lines.push(
      "> There is critical information unresolved. Do not execute the plan until the user answers.",
    );
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
  lines.push(
    "_The checkboxes are ticked by `plan_mark_step`: `[x]` completed, `[!]` failed with its error._",
  );
  lines.push("");

  return lines.join("\n");
}

export const planModule: DomainModule = {
  id: "plan",
  prefix: "plan_",
  description:
    "Planning and execution of multi-step tasks: create a markdown plan with a checklist, execute it step by step and keep an auditable record.",
  tools,
};

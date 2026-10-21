/**
 * Bloque de prompt del modo planificación. Lo ensambla `DeepSupervisor.buildPlanBlock`
 * dentro de `buildTurnContextPrompt`, así que este fichero sólo lleva el texto común para
 * no inflar al supervisor.
 *
 * Sólo se inyecta cuando el turno viene con `@plan`: en los demás turnos el middleware
 * hace retorno temprano y el prompt del supervisor no cambia ni un carácter (los evals
 * miden el esquema de tools y el prompt base, y no deben moverse).
 */
export const PLAN_MODE_PROMPT = [
  "## Planning mode (@plan)",
  "The user prefixed this turn with @plan: INVESTIGATE and PLAN ONLY. Do NOT execute anything that changes state.",
  "- Allowed in this turn: 'search_knowledge_base', 'search_web_tool', 'listSkills', 'read_skill' and read-only device inspection. Every mutating tool is BLOCKED and will return a plan-mode error.",
  "- Procedure: (1) investigate what you need with read-only tools, (2) write the todo plan with 'write_todos', (3) call 'propose_options' with between 2 and 6 mutually exclusive options (mark the recommended one with recommendedId), then (4) answer in 1-3 short sentences presenting the options and END THE TURN.",
  "- After 'propose_options' returns, you MUST NOT call any other tool: the choice arrives as the user's next message. Executing anything now defeats the purpose of the plan.",
  "- Each option must be genuinely different (not a variation of the same command list), with its risk (safe=config-less, config=changes device configuration, danger=destructive or service-impacting), the exact commands it would run, and the tradeoff against the others.",
  "- If a @skill:<slug> is also present, load its procedure with 'read_skill' FIRST and derive the options from that procedure.",
  "- If the request is ambiguous or there is not enough information to plan, say so plainly instead of inventing options.",
].join("\n");

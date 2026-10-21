export type McpErrorCode =
  | "VALIDATION"
  | "NOT_CONFIGURED"
  | "UNAVAILABLE"
  | "NOT_FOUND"
  | "NO_SESSION"
  | "TIMEOUT"
  | "OPERATION_FAILED"
  | "INTERNAL";

export class McpToolError extends Error {
  readonly code: McpErrorCode;
  readonly suggestion?: string;
  readonly detail?: Record<string, unknown>;

  constructor(
    code: McpErrorCode,
    message: string,
    options: { suggestion?: string; detail?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "McpToolError";
    this.code = code;
    this.suggestion = options.suggestion;
    this.detail = options.detail;
  }

  toModelMessage(): string {
    return this.suggestion
      ? `[${this.code}] ${this.message}\n\nWhat to do next: ${this.suggestion}`
      : `[${this.code}] ${this.message}`;
  }
}


export function validationError(
  message: string,
  suggestion = "Check the parameters and call the tool again with valid values.",
): McpToolError {
  return new McpToolError("VALIDATION", message, { suggestion });
}


export function configurationError(
  message: string,
  suggestion: string,
): McpToolError {
  return new McpToolError("NOT_CONFIGURED", message, { suggestion });
}


export function unavailableError(
  message: string,
  suggestion: string,
): McpToolError {
  return new McpToolError("UNAVAILABLE", message, { suggestion });
}


export function normalizeError(error: unknown): McpToolError {
  if (error instanceof McpToolError) return error;

  if (error instanceof Error) {
    return new McpToolError("INTERNAL", error.message, {
      suggestion:
        "This is an MCP server failure, not a parameter problem. Report it to the user with this message and do not repeat the same call expecting a different result.",
      detail: { stack: error.stack },
    });
  }

  return new McpToolError("INTERNAL", String(error), {
    suggestion:
      "This is an MCP server failure, not a parameter problem. Report it to the user and do not repeat the call.",
  });
}


export function withNormalizedErrors<A, R>(
  handler: (args: A) => Promise<R>,
): (args: A) => Promise<R> {
  return async (args: A) => {
    try {
      return await handler(args);
    } catch (error) {
      throw normalizeError(error);
    }
  };
}

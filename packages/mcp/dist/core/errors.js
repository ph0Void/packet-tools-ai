"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpToolError = void 0;
exports.validationError = validationError;
exports.configurationError = configurationError;
exports.unavailableError = unavailableError;
exports.normalizeError = normalizeError;
exports.withNormalizedErrors = withNormalizedErrors;
class McpToolError extends Error {
    code;
    suggestion;
    detail;
    constructor(code, message, options = {}) {
        super(message);
        this.name = "McpToolError";
        this.code = code;
        this.suggestion = options.suggestion;
        this.detail = options.detail;
    }
    toModelMessage() {
        return this.suggestion
            ? `[${this.code}] ${this.message}\n\nWhat to do next: ${this.suggestion}`
            : `[${this.code}] ${this.message}`;
    }
}
exports.McpToolError = McpToolError;
function validationError(message, suggestion = "Check the parameters and call the tool again with valid values.") {
    return new McpToolError("VALIDATION", message, { suggestion });
}
function configurationError(message, suggestion) {
    return new McpToolError("NOT_CONFIGURED", message, { suggestion });
}
function unavailableError(message, suggestion) {
    return new McpToolError("UNAVAILABLE", message, { suggestion });
}
function normalizeError(error) {
    if (error instanceof McpToolError)
        return error;
    if (error instanceof Error) {
        return new McpToolError("INTERNAL", error.message, {
            suggestion: "This is an MCP server failure, not a parameter problem. Report it to the user with this message and do not repeat the same call expecting a different result.",
            detail: { stack: error.stack },
        });
    }
    return new McpToolError("INTERNAL", String(error), {
        suggestion: "This is an MCP server failure, not a parameter problem. Report it to the user and do not repeat the call.",
    });
}
function withNormalizedErrors(handler) {
    return async (args) => {
        try {
            return await handler(args);
        }
        catch (error) {
            throw normalizeError(error);
        }
    };
}
//# sourceMappingURL=errors.js.map
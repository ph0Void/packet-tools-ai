"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gns3McpClient = void 0;
exports.resolveGns3Credentials = resolveGns3Credentials;
exports.createGns3Client = createGns3Client;
const EnvConfig_1 = require("../../config/EnvConfig.js");
const PrismaClient_1 = require("../../prisma/lib/PrismaClient.js");
const Logger_1 = require("../../utils/Logger.js");
const errors_1 = require("../../core/errors.js");
const DEFAULT_BASE_URL = "http://localhost:3080/v2";
const TIMEOUT_MS = 15_000;
function normalizeBaseUrl(host) {
    const value = (host ?? EnvConfig_1.envConfig.MCP_GNS3_URL ?? "").trim().replace(/\/+$/, "");
    if (!value)
        return DEFAULT_BASE_URL;
    return value.endsWith("/v2") ? value : `${value}/v2`;
}
async function resolveGns3Credentials(providerId) {
    try {
        const row = providerId?.trim()
            ? await PrismaClient_1.prismaClient.deviceProviderMcp.findUnique({ where: { id: providerId.trim() } })
            : await PrismaClient_1.prismaClient.deviceProviderMcp.findFirst({
                where: { typeDevice: "GNS3" },
                orderBy: { updatedAt: "desc" },
            });
        if (row) {
            if (row.typeDevice !== "GNS3" && providerId) {
                throw (0, errors_1.configurationError)(`The device '${row.name}' is not of type GNS3 (it is ${row.typeDevice}).`, "Use the id of a GNS3 device or call gns3_list_configured_servers to see the configured ones.");
            }
            return {
                baseUrl: normalizeBaseUrl(row.host),
                username: row.username ?? null,
                password: row.password ?? null,
            };
        }
    }
    catch (error) {
        if (error instanceof errors_1.McpToolError)
            throw error;
        Logger_1.Logger.debug("Could not read the GNS3 credentials from the MCP database.", {
            error: String(error),
        });
    }
    return {
        baseUrl: normalizeBaseUrl(null),
        username: null,
        password: null,
    };
}
class Gns3McpClient {
    baseUrl;
    authHeader;
    constructor(credentials) {
        this.baseUrl = credentials.baseUrl;
        this.authHeader =
            credentials.username && credentials.password
                ? `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`
                : null;
    }
    get url() {
        return this.baseUrl;
    }
    async request(endpoint, options = {}, parseAs = "json") {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let response;
        try {
            response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    ...(this.authHeader ? { Authorization: this.authHeader } : {}),
                    ...(options.headers ?? {}),
                },
            });
        }
        catch (error) {
            clearTimeout(timer);
            const message = error instanceof Error ? error.message : String(error);
            throw (0, errors_1.unavailableError)(`Could not contact the GNS3 server at ${this.baseUrl}: ${message}`, "Check that the GNS3 server is running and that the URL is correct (by default http://localhost:3080/v2). " +
                "If your GNS3 is on another machine or port, configure the GNS3 device with that URL.");
        }
        clearTimeout(timer);
        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            const truncated = detail.slice(0, 300);
            if (response.status === 401 || response.status === 403) {
                throw (0, errors_1.configurationError)(`GNS3 rejected authentication (HTTP ${response.status}).`, "Check the username and password of the GNS3 device in the MCP configuration.");
            }
            throw new errors_1.McpToolError("OPERATION_FAILED", `GNS3 responded HTTP ${response.status} at ${endpoint}${truncated ? `: ${truncated}` : ""}`, {
                suggestion: "Check that the project and the identifiers exist (use the gns3_list_* tools to see the real ones) and that the GNS3 server is operational.",
            });
        }
        if (response.status === 204)
            return null;
        try {
            if (parseAs === "text")
                return await response.text();
            if (parseAs === "buffer")
                return Buffer.from(await response.arrayBuffer());
            return await response.json();
        }
        catch {
            return null;
        }
    }
    async get(endpoint, parseAs = "json") {
        return this.request(endpoint, { method: "GET" }, parseAs);
    }
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: "POST",
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
    }
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: "PUT",
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
    }
    async del(endpoint) {
        return this.request(endpoint, { method: "DELETE" });
    }
}
exports.Gns3McpClient = Gns3McpClient;
async function createGns3Client(providerId) {
    const credentials = await resolveGns3Credentials(providerId);
    return new Gns3McpClient(credentials);
}
//# sourceMappingURL=Gns3McpClient.js.map
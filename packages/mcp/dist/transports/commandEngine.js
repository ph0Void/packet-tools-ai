"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VENDOR_PROFILES = void 0;
exports.detectVendorFromPrompt = detectVendorFromPrompt;
exports.resolveVendor = resolveVendor;
exports.detectPrompt = detectPrompt;
exports.sanitizeOutput = sanitizeOutput;
exports.truncateOutput = truncateOutput;
exports.runCommands = runCommands;
exports.conservativeVendorNote = conservativeVendorNote;
const EnvConfig_1 = require("../config/EnvConfig.js");
const Logger_1 = require("../utils/Logger.js");
const PROMPT_MAX_CHARS = 120;
function clean(line) {
    return String(line ?? "")
        .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
        .replace(/\r/g, "")
        .trim();
}
function looksLikePrompt(line) {
    const text = clean(line);
    return text.length > 0 && text.length <= PROMPT_MAX_CHARS;
}
const CISCO = {
    id: "cisco",
    label: "Cisco IOS",
    isSubMode: (line) => /\)#$/.test(clean(line)),
    isPrompt: (line) => {
        const text = clean(line);
        return looksLikePrompt(text) && /[#>]\s*$/.test(text);
    },
    transitions: {
        toUserMode: "disable",
        toPrivilegedMode: "enable",
        toConfigMode: "configure terminal",
        saveConfig: "write memory",
        exitConfigMode: "exit",
    },
    preamble: { disablePagination: "terminal length 0" },
    pager: [/--More--/, /\(END\)/],
};
const HUAWEI_VIEW = /^\[[^\]]*\]\s*$/;
const HUAWEI = {
    id: "huawei",
    label: "Huawei VRP",
    isSubMode: (line) => /^\[[^\]]*[-/][^\]]*\]\s*$/.test(clean(line)),
    isPrompt: (line) => {
        const text = clean(line);
        if (!looksLikePrompt(text))
            return false;
        return HUAWEI_VIEW.test(text) || /^<[^<>]+>\s*$/.test(text);
    },
    transitions: {
        toUserMode: "quit",
        toPrivilegedMode: null,
        toConfigMode: "system-view",
        saveConfig: "save",
        exitConfigMode: "quit",
    },
    preamble: { disablePagination: "screen-length 0 temporary" },
    pager: [/----\s*More\s*----/, /\(END\)/],
};
const MIKROTIK_ROOT = /^\[[^\]]*@[^\]]*\]\s*[>\/]?\s*$/;
const MIKROTIK_MENU = /^\[[^\]]*@[^\]]*\]\s*\/\S+/;
const MIKROTIK_MENU_PATH = /^\[[^\]]*@[^\]]*\]\s*\/\S[^>]*>\s*$/;
const MIKROTIK = {
    id: "mikrotik",
    label: "MikroTik RouterOS",
    isSubMode: (line) => MIKROTIK_MENU.test(clean(line)),
    isPrompt: (line) => {
        const text = clean(line);
        return looksLikePrompt(text) && (MIKROTIK_ROOT.test(text) || MIKROTIK_MENU.test(text));
    },
    transitions: {
        toUserMode: "/exit",
        toPrivilegedMode: null,
        toConfigMode: null,
        saveConfig: null,
        exitConfigMode: "..",
    },
    preamble: { disablePagination: null },
    pager: [/\[Q\s*\|\s*quit\]/, /\(END\)/],
};
const ARUBA_PROMPT = /^\([^()]*\)(\s+\([^()]*\))*\s*[#>]\s*$/;
const ARUBA = {
    id: "aruba",
    label: "ArubaOS",
    isSubMode: (line) => {
        const text = clean(line);
        if (!ARUBA_PROMPT.test(text))
            return false;
        const groups = text.match(/\([^()]*\)/g) ?? [];
        return groups.length >= 2 || /\(\s*config[^()]*\)/i.test(text);
    },
    isPrompt: (line) => {
        const text = clean(line);
        return looksLikePrompt(text) && ARUBA_PROMPT.test(text);
    },
    transitions: {
        toUserMode: "exit",
        toPrivilegedMode: "enable",
        toConfigMode: "configure terminal",
        saveConfig: null,
        exitConfigMode: "exit",
    },
    preamble: { disablePagination: null },
    pager: [/--More--/, /\(END\)/],
};
const JUNOS_PROMPT = /^\S+@\S+[>#]\s*$/;
const JUNOS_HOST_PROMPT = /^\S+@\S*[A-Za-z0-9][>#]\s*$/;
const JUNOS_SUBMODE = /^\s*\[(?:edit|configure|top)[^\]]*\]\s*$/;
const JUNOS = {
    id: "junos",
    label: "Juniper JunOS",
    isSubMode: (line) => JUNOS_SUBMODE.test(clean(line)),
    isPrompt: (line) => {
        const text = clean(line);
        return looksLikePrompt(text) && JUNOS_PROMPT.test(text);
    },
    transitions: {
        toUserMode: "exit",
        toPrivilegedMode: null,
        toConfigMode: "configure",
        saveConfig: "commit",
        exitConfigMode: "exit",
    },
    preamble: { disablePagination: "set cli screen-length 0" },
    pager: [/--More--/, /-{2,}\s*\(\s*more\s*\)\s*-{2,}/, /\(END\)/],
};
const GENERIC_PROMPT = /[#>]\s*$/;
const GENERIC_NESTED_PROMPT = /\([^()]*\)\s*[#>]\s*$|^\s*\[[^\]]+\]\s*$/;
const CONSERVATIVE_PROFILE = {
    id: "conservative",
    label: "Generic (vendor not identified)",
    isSubMode: (line) => {
        const text = clean(line);
        if (!looksLikePrompt(text))
            return false;
        if (/^\[[^\]]*@[^\]]*\]\s*\/\S+/.test(text))
            return true;
        if (/^\[(?!.*@)[^\]]+\]\s*[>#]?\s*$/.test(text))
            return true;
        return false;
    },
    isPrompt: (line) => {
        const text = clean(line);
        if (!looksLikePrompt(text))
            return false;
        if (/^\[[^\]]*@[^\]]*\]\s*\/\S+/.test(text))
            return true;
        if (/[#>\]]$/.test(text))
            return true;
        const last = text.split(/\s+/).pop() ?? "";
        return /[$%>]$/.test(last);
    },
    transitions: {
        toUserMode: null,
        toPrivilegedMode: null,
        toConfigMode: null,
        saveConfig: null,
        exitConfigMode: null,
    },
    preamble: { disablePagination: null },
    pager: [/--More--/, /----\s*More\s*----/, /\(END\)/],
};
exports.VENDOR_PROFILES = {
    cisco: CISCO,
    huawei: HUAWEI,
    mikrotik: MIKROTIK,
    aruba: ARUBA,
    junos: JUNOS,
    conservative: CONSERVATIVE_PROFILE,
};
function detectVendorFromPrompt(prompt) {
    const text = clean(prompt);
    if (!looksLikePrompt(text))
        return null;
    if (MIKROTIK_ROOT.test(text) || MIKROTIK_MENU.test(text))
        return "mikrotik";
    if (JUNOS_SUBMODE.test(text) || JUNOS_HOST_PROMPT.test(text))
        return "junos";
    if (HUAWEI_VIEW.test(text) || /^<[^<>]+>\s*$/.test(text))
        return "huawei";
    if (ARUBA_PROMPT.test(text))
        return "aruba";
    if (/\(config[^)]*\)#\s*$/.test(text))
        return "cisco";
    return null;
}
/**
 * `TypeDeviceMcp` → perfil. El enum ya trae FORTIGATE, H3C, PALO_ALTO, ARISTA y VYOS
 * además de JUNOS; sin este mapa caían todos al perfil conservador, que no entra ni sale
 * de configuración ni guarda. Las marcas nuevas se alinean al perfil cuya CLI más se
 * parece en lugar de duplicar cinco perfiles completos.
 */
const DEVICE_TO_VENDOR = {
    CISCO: "cisco",
    HUAWEI: "huawei",
    ARUBA: "aruba",
    MIKROTIK: "mikrotik",
    JUNOS: "junos",
    JUNIPER: "junos",
    // Comware comparte con VRP `system-view`, `screen-length` y `display`.
    H3C: "huawei",
    // Arista EOS es IOS-like: `configure terminal` + `write memory`.
    ARISTA: "cisco",
    // PAN-OS y FortiOS usan su propia CLI (`configure`/`commit`, `config`/`get`): sin perfil
    // propio, el conservativo al menos no inventa transiciones que el equipo rechazaría.
    PALO_ALTO: "conservative",
    FORTIGATE: "conservative",
    VYOS: "conservative",
};
function resolveVendor(input) {
    const declared = String(input.typeDevice ?? "").trim().toUpperCase();
    const mapped = DEVICE_TO_VENDOR[declared];
    if (mapped) {
        return exports.VENDOR_PROFILES[mapped];
    }
    const detected = detectVendorFromPrompt(input.prompt);
    return detected ? exports.VENDOR_PROFILES[detected] : CONSERVATIVE_PROFILE;
}
const SESSION_END_COMMANDS = /^(exit|quit|logout|disconnect|close)$/i;
function detectPrompt(output, isPrompt) {
    const lines = String(output ?? "").split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = clean(lines[i]);
        if (!line)
            continue;
        return isPrompt(line) ? line : null;
    }
    return null;
}
function sanitizeOutput(text) {
    return String(text ?? "")
        .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
        .replace(/\x1b\][^\x07]*\x07/g, "")
        .replace(/[^\n]\x08/g, "")
        .replace(/\r(?!\n)/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function truncateOutput(text) {
    const max = EnvConfig_1.envConfig.MCP_MAX_OUTPUT_CHARS;
    if (text.length <= max)
        return text;
    return `${text.slice(0, max)}\n\n[...output truncated: ${text.length - max} characters omitted. Use a more specific command to see the rest.]`;
}
async function runCommands(transport, commands, context, options = {}) {
    const startTime = Date.now();
    const idleMs = options.idleMs ?? EnvConfig_1.envConfig.MCP_TERMINAL_IDLE_MS;
    const maxMs = options.maxMs ?? EnvConfig_1.envConfig.MCP_TERMINAL_MAX_MS;
    await transport.connect();
    const initialOutput = await transport.readOutput({ idleMs: 300, maxMs: 3000 });
    let profile = options.forcedVendorId
        ? exports.VENDOR_PROFILES[options.forcedVendorId] ?? CONSERVATIVE_PROFILE
        : resolveVendor({ typeDevice: context.typeDevice, prompt: initialOutput });
    const initialPrompt = detectPrompt(initialOutput, profile.isPrompt);
    let vendorDetectedThisCall = !options.forcedVendorId && Boolean(initialPrompt);
    if (!options.forcedVendorId && profile.id === "conservative" && !initialPrompt) {
        const secondRead = await transport.readOutput({ idleMs: 500, maxMs: 4000 });
        const latePrompt = detectPrompt(secondRead, (l) => /[#>\]$]/.test(l));
        if (latePrompt) {
            profile = resolveVendor({ typeDevice: context.typeDevice, prompt: latePrompt });
            vendorDetectedThisCall = profile.id !== "conservative";
        }
    }
    Logger_1.Logger.debug(`Transport ${transport.protocol}: vendor resolved as '${profile.id}' (${profile.label}).`);
    const outputs = [];
    if (!options.skipPreamble && profile.preamble.disablePagination) {
        try {
            await transport.sendCommand(profile.preamble.disablePagination);
            await transport.readOutput({ idleMs, maxMs: 5000 });
        }
        catch (error) {
            Logger_1.Logger.debug(`The preamble '${profile.preamble.disablePagination}' failed: ${String(error)}`);
        }
    }
    const discarded = [];
    for (const rawCommand of commands) {
        for (const line of String(rawCommand).split(/\r?\n/)) {
            const command = line.trim();
            if (!command)
                continue;
            if (SESSION_END_COMMANDS.test(command)) {
                discarded.push(command);
                continue;
            }
            await transport.sendCommand(command);
            const output = await transport.readOutput({ idleMs, maxMs });
            outputs.push(`$ ${command}\n${sanitizeOutput(output)}`.trim());
        }
    }
    const finalOutput = await transport.readOutput({ idleMs: 200, maxMs: 2000 });
    const finalPrompt = detectPrompt(finalOutput, profile.isPrompt) ?? initialPrompt;
    const warnings = [];
    if (discarded.length > 0) {
        warnings.push(`Discarded ${discarded.length} session-end command(s) (${discarded.join(", ")}): ` +
            `closing the console would lock the user out.`);
    }
    const output = [
        outputs.join("\n\n"),
        warnings.length > 0 ? `\nWARNING: ${warnings.join(" ")}` : "",
    ]
        .filter(Boolean)
        .join("");
    return {
        output: truncateOutput(output),
        prompt: finalPrompt,
        vendorId: profile.id,
        vendorLabel: profile.label,
        vendorDetected: vendorDetectedThisCall,
        durationMs: Date.now() - startTime,
    };
}
function conservativeVendorNote(result) {
    if (result.vendorId !== "conservative")
        return "";
    return ("\n\nNOTE: the device vendor could not be identified from its prompt, so the generic profile was used. " +
        "This means the commands were sent as-is, WITHOUT a preamble (pagination) and WITHOUT mode transitions. " +
        "If you know the brand, set it in 'typeDevice' when configuring the device so its syntax is used.");
}
//# sourceMappingURL=commandEngine.js.map
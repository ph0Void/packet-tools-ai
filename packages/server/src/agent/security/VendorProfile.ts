export type VendorId =
  | "cisco"
  | "huawei"
  | "mikrotik"
  | "aruba"
  | "junos"
  | "fortios"
  | "h3c"
  | "panos"
  | "arista"
  | "vyos"
  | "conservative";

const PROMPT_MAX_CHARS = 120;

export interface VendorPromptProfile {

  user: RegExp;

  enable: RegExp;

  config: RegExp;

  isNested(linea?: string | null): boolean;

  isPrompt(linea?: string | null): boolean;
}

export interface VendorTransitions {

  aUsuario: string | null;

  aPrivilegiado: string | null;

  aConfig: string | null;

  guardarConfig: string | null;

  salirDeConfig: string | null;
}

export interface VendorPreamble {

  sinPaginacion: string | null;

  sinLookupDns: string | null;
}

export interface ConfirmacionLegitima {

  patron: RegExp;

  respuesta?: string;

  nota: string;
}

export interface VendorBootDialogs {

  promptPatrones: readonly RegExp[];

  confirmacionPatrones: readonly RegExp[];

  respuestaConfirmacion: string;

  confirmacionesLegitimas: readonly ConfirmacionLegitima[];
}

export const CONFIRMACION_DESTRUCTIVA_RE =
  /\b(reload|reboot|erase|reset|delete|format|boot\s+system|factory[-\s]?(reset|default))\b/i;

export interface VendorProfile {
  id: VendorId;

  label: string;
  prompt: VendorPromptProfile;
  transiciones: VendorTransitions;

  paginador: readonly RegExp[];
  preambulo: VendorPreamble;

  eol: "\r";

  abortKey: string | null;

  sondeo: string | null;
  dialogos: VendorBootDialogs;
}

function limpiarPrompt(linea?: string | null): string {
  return String(linea ?? "")
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .replace(/\r/g, "")
    .trim();
}

function parecePrompt(linea: string): boolean {
  const texto = limpiarPrompt(linea);
  return texto.length > 0 && texto.length <= PROMPT_MAX_CHARS;
}

const CISCO_NESTED = /\)#$/;

const CISCO_PROFILE: VendorProfile = {
  id: "cisco",
  label: "Cisco IOS",
  prompt: {

    user: />\s*$/,
    enable: /#\s*$/,
    config: /\(config[^)]*\)#\s*$/,
    isNested: (linea) => CISCO_NESTED.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      return parecePrompt(texto) && /[#>]\s*$/.test(texto);
    },
  },
  transiciones: {
    aUsuario: "disable",
    aPrivilegiado: "enable",
    aConfig: "configure terminal",
    guardarConfig: "write memory",

    salirDeConfig: "exit",
  },
  paginador: [/--More--/, /\(END\)/],
  preambulo: {
    sinPaginacion: "terminal length 0",
    sinLookupDns: "no ip domain-lookup",
  },
  eol: "\r",
  abortKey: "\u001e", // Ctrl+^
  sondeo: "show clock",
  dialogos: {
    promptPatrones: [
      /Continue with configuration dialog/i,
      /System configuration has been modified/i,
    ],
    confirmacionPatrones: [/\[yes\/no\]/i, /\[confirm\]/i, /\[\w+\]\?/i],

    respuestaConfirmacion: "",
    confirmacionesLegitimas: [
      {

        patron: /Destination filename \[[^\]]+\]/i,
        respuesta: "",
        nota: "el equipo propone el fichero entre corchetes: se acepta con Enter, no se escribe texto",
      },
    ],
  },
};

const HUAWEI_VISTA = /^\[[^\]]*\]\s*$/;

const HUAWEI_PROFILE: VendorProfile = {
  id: "huawei",
  label: "Huawei VRP",
  prompt: {
    user: /^<[^<>]+>\s*$/,

    enable: HUAWEI_VISTA,
    config: HUAWEI_VISTA,

    isNested: (linea) => /^\[[^\]]*[-/][^\]]*\]\s*$/.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      if (!parecePrompt(texto)) return false;
      return HUAWEI_VISTA.test(texto) || /^<[^<>]+>\s*$/.test(texto);
    },
  },
  transiciones: {
    aUsuario: "quit",

    aPrivilegiado: null,
    aConfig: "system-view",
    guardarConfig: "save",

    salirDeConfig: "quit",
  },
  paginador: [/----\s*More\s*----/, /\(END\)/],
  preambulo: {
    sinPaginacion: "screen-length 0 temporary",
    sinLookupDns: "undo ip domain-lookup",
  },
  eol: "\r",
  abortKey: "\u0003", // Ctrl+C
  sondeo: "display clock",
  dialogos: {
    promptPatrones: [/The current configuration will be written to the device/i],
    confirmacionPatrones: [/\[y\/n\]/i, /\[y\/n\]:/i, /Are you sure/i],
    respuestaConfirmacion: "n",

    confirmacionesLegitimas: [],
  },
};

const MIKROTIK_RAIZ = /^\[[^\]]*@[^\]]*\]\s*[>\/]?\s*$/;
const MIKROTIK_MENU = /^\[[^\]]*@[^\]]*\]\s*\/\S+/;

const MIKROTIK_RUTA_MENU = /^\[[^\]]*@[^\]]*\]\s*\/\S[^>]*>\s*$/;

const MIKROTIK_PROFILE: VendorProfile = {
  id: "mikrotik",
  label: "MikroTik RouterOS",
  prompt: {
    user: MIKROTIK_RAIZ,

    enable: MIKROTIK_RAIZ,

    config: MIKROTIK_RUTA_MENU,

    isNested: (linea) => MIKROTIK_MENU.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      return (
        parecePrompt(texto) && (MIKROTIK_RAIZ.test(texto) || MIKROTIK_MENU.test(texto))
      );
    },
  },
  transiciones: {
    aUsuario: "/exit",
    aPrivilegiado: null,

    aConfig: null,
    guardarConfig: null,

    salirDeConfig: "..",
  },
  paginador: [/\[Q\s*\|\s*quit\]/, /\(END\)/],
  preambulo: {

    sinPaginacion: null,
    sinLookupDns: null,
  },
  eol: "\r",
  abortKey: "\u0003", // Ctrl+C

  sondeo: null,
  dialogos: {
    promptPatrones: [],

    confirmacionPatrones: [/\[y\/n\]/i, /\(y\/n\)/i],
    respuestaConfirmacion: "n",

    confirmacionesLegitimas: [],
  },
};

const ARUBA_PROMPT = /^\([^()]*\)(\s+\([^()]*\))*\s*[#>]\s*$/;

const ARUBA_GRUPOS = /\([^()]*\)/g;

const ARUBA_PROFILE: VendorProfile = {
  id: "aruba",
  label: "ArubaOS",
  prompt: {
    user: /^\([^()]*\)\s*>\s*$/,
    enable: /^\([^()]*\)\s*#\s*$/,
    config: /^\([^()]*\)\s+\([^()]*\)\s*[#>]\s*$/,

    isNested: (linea) => {
      const texto = limpiarPrompt(linea);
      if (!ARUBA_PROMPT.test(texto)) return false;
      const grupos = texto.match(ARUBA_GRUPOS) ?? [];
      return grupos.length >= 2 || /\(\s*config[^()]*\)/i.test(texto);
    },
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      return parecePrompt(texto) && ARUBA_PROMPT.test(texto);
    },
  },
  transiciones: {
    aUsuario: "exit",
    aPrivilegiado: "enable",
    aConfig: "configure terminal",

    guardarConfig: null,
    salirDeConfig: "exit",
  },
  paginador: [/--More--/, /\(END\)/],
  preambulo: {
    sinPaginacion: null,
    sinLookupDns: null,
  },
  eol: "\r",
  abortKey: null,
  sondeo: null,
  dialogos: {
    promptPatrones: [/Do you want to save the configuration/i],
    confirmacionPatrones: [/\[y\/n\]/i, /\(y\/n\)/i],
    respuestaConfirmacion: "n",

    confirmacionesLegitimas: [],
  },
};

const JUNOS_PROMPT = /^\S+@\S+[>#]\s*$/;

const JUNOS_HOST_PROMPT = /^\S+@\S*[A-Za-z0-9][>#]\s*$/;

const JUNOS_SUBMODO = /^\s*\[(?:edit|configure|top)[^\]]*\]\s*$/;

const JUNOS_PROFILE: VendorProfile = {
  id: "junos",
  label: "Juniper JunOS",
  prompt: {
    user: JUNOS_PROMPT,

    enable: JUNOS_PROMPT,

    config: JUNOS_PROMPT,

    isNested: (linea) => JUNOS_SUBMODO.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      return parecePrompt(texto) && JUNOS_PROMPT.test(texto);
    },
  },
  transiciones: {
    aUsuario: "exit",
    aPrivilegiado: null,
    aConfig: "configure",
    guardarConfig: "commit",

    salirDeConfig: "exit",
  },

  paginador: [/--More--/, /-{2,}\s*\(\s*more\s*\)\s*-{2,}/, /\(END\)/],
  preambulo: {
    sinPaginacion: "set cli screen-length 0",
    sinLookupDns: null,
  },
  eol: "\r",
  abortKey: "\u0003", // Ctrl+C
  sondeo: null,

  dialogos: {
    promptPatrones: [],
    confirmacionPatrones: [/continue\?/i, /\[yes\s*,\s*no\s*\]/i],
    respuestaConfirmacion: "",
    confirmacionesLegitimas: [],
  },
};

/* ------------------------------------------------------------------ *
 * Nuevas marcas del enum `TypeDevice`: FORTIGATE, H3C, PALO_ALTO,     *
 * ARISTA y VYOS. Hasta ahora un dispositivo de estas marcas resolvía   *
 * al perfil `conservative`, que no sabe paginar ni entrar/salir de     *
 * configuración: la salida llegaba truncada en `--More--` y            *
 * `guardarConfig` no existía, así que ningún cambio se podía aplicar.  *
 * ------------------------------------------------------------------ */

const FORTIOS_PROMPT = /^\S+\s*[#>]\s*$/;

const FORTIOS_PROFILE: VendorProfile = {
  id: "fortios",
  label: "FortiGate FortiOS",
  prompt: {
    user: /^\S+\s*>\s*$/,

    enable: FORTIOS_PROMPT,

    config: /^\(global\)\s*#\s*$/i,

    isNested: (linea) => /^\((?:global|vdom|[\w-]+)\)/i.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      return parecePrompt(texto) && FORTIOS_PROMPT.test(texto);
    },
  },
  transiciones: {
    aUsuario: "end",
    aPrivilegiado: null,

    aConfig: "config system interface",

    guardarConfig: null,
    salirDeConfig: "end",
  },
  paginador: [/--\s*More\s*--/, /\(END\)/i],
  preambulo: {
    sinPaginacion: "config system console\nset output standard\nend",
    sinLookupDns: null,
  },
  eol: "\r",
  abortKey: "\u001a", // Ctrl+Z
  sondeo: "get system status",
  dialogos: {
    promptPatrones: [],
    confirmacionPatrones: [/\(y\/n\)/i, /Do you want to continue\?/i, /Are you sure\?/i],
    respuestaConfirmacion: "n",
    confirmacionesLegitimas: [],
  },
};

const H3C_PROMPT = /^<[^<>]+>\s*$/;

const H3C_VISTA = /^\[[^\]]*\]\s*$/;

const H3C_PROFILE: VendorProfile = {
  id: "h3c",
  label: "H3C Comware",
  prompt: {
    user: H3C_PROMPT,

    enable: H3C_VISTA,
    config: H3C_VISTA,
    isNested: (linea) => /^\[[^\]]*[-/][^\]]*\]\s*$/.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      if (!parecePrompt(texto)) return false;
      return H3C_VISTA.test(texto) || H3C_PROMPT.test(texto);
    },
  },
  transiciones: {
    aUsuario: "quit",

    aPrivilegiado: null,
    aConfig: "system-view",
    guardarConfig: "save force",
    salirDeConfig: "quit",
  },
  paginador: [/----\s*More\s*----/, /\(END\)/i],
  preambulo: {
    sinPaginacion: "screen-length disable",
    sinLookupDns: "undo ip host",
  },
  eol: "\r",
  abortKey: "\u0003", // Ctrl+C
  sondeo: "display clock",
  dialogos: {
    promptPatrones: [/The current configuration will be written to the device/i],
    confirmacionPatrones: [/\[y\/n\]/i, /\[y\/n\]:/i, /Are you sure/i],
    respuestaConfirmacion: "n",
    confirmacionesLegitimas: [],
  },
};

const PANOS_PROMPT = /^\S+@\S+[>#]\s*$/;

const PANOS_PROFILE: VendorProfile = {
  id: "panos",
  label: "Palo Alto PAN-OS",
  prompt: {
    user: /^\S+@\S+>\s*$/,

    enable: PANOS_PROMPT,

    config: /^\S+@\S+#\s*$/,

    isNested: (linea) => /^\[(?:edit|set|show)[^\]]*\]\s*$/i.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      return parecePrompt(texto) && PANOS_PROMPT.test(texto);
    },
  },
  transiciones: {
    aUsuario: "exit",
    aPrivilegiado: null,

    aConfig: "configure",

    guardarConfig: "commit",

    salirDeConfig: "exit",
  },
  paginador: [/--\s*More\s*--/, /\(END\)/i],
  preambulo: {
    sinPaginacion: "set cli pager off",
    sinLookupDns: null,
  },
  eol: "\r",
  abortKey: "\u0003", // Ctrl+C
  sondeo: "show system info",
  dialogos: {
    promptPatrones: [],
    confirmacionPatrones: [/\(y\/n\)/i, /are you sure you want to continue/i],
    respuestaConfirmacion: "n",
    confirmacionesLegitimas: [],
  },
};

const ARISTA_PROMPT = /^\S+[#>]\s*$/;

const ARISTA_PROFILE: VendorProfile = {
  id: "arista",
  label: "Arista EOS",
  prompt: {
    user: />\s*$/,

    enable: ARISTA_PROMPT,

    config: /\(config[^)]*\)#\s*$/,

    isNested: (linea) => /\([^()]*\)\s*#\s*$/.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      return parecePrompt(texto) && ARISTA_PROMPT.test(texto);
    },
  },
  transiciones: {
    aUsuario: "disable",
    aPrivilegiado: "enable",
    aConfig: "configure terminal",
    guardarConfig: "write memory",
    salirDeConfig: "end",
  },
  paginador: [/--More--/, /\(END\)/],
  preambulo: {
    sinPaginacion: "terminal length 0",
    sinLookupDns: "no ip domain-lookup",
  },
  eol: "\r",
  abortKey: "\u001e", // Ctrl+^
  sondeo: "show clock",
  dialogos: {
    promptPatrones: [],
    confirmacionPatrones: [/\[yes\/no\]/i, /\[confirm\]/i, /\[\w+\]\?/i],
    respuestaConfirmacion: "",
    confirmacionesLegitimas: [],
  },
};

const VYOS_PROMPT = /^\S+@\S+:\s*~\$\s*$/;

const VYOS_PROFILE: VendorProfile = {
  id: "vyos",
  label: "VyOS / Vyatta",
  prompt: {
    user: VYOS_PROMPT,

    enable: /^\S+@\S+:\s*~\$\s*$/,

    config: /^\[edit\]\s*$/,

    isNested: (linea) => /^\[edit[^\]]*\]\s*$/.test(limpiarPrompt(linea)),
    isPrompt: (linea) => {
      const texto = limpiarPrompt(linea);
      if (!parecePrompt(texto)) return false;
      return VYOS_PROMPT.test(texto) || /^\[edit[^\]]*\]\s*$/.test(texto);
    },
  },
  transiciones: {
    aUsuario: "exit",
    aPrivilegiado: null,

    aConfig: "configure",

    guardarConfig: "commit; save",

    salirDeConfig: "exit",
  },
  paginador: [/--More--/, /\(END\)/],
  preambulo: {
    sinPaginacion: "set cli screen-length 0",
    sinLookupDns: "set system name-server '127.0.0.1'",
  },
  eol: "\r",
  abortKey: "\u0003", // Ctrl+C
  sondeo: "show version",
  dialogos: {
    promptPatrones: [],
    confirmacionPatrones: [/\[y\/n\]/i, /Are you sure\?/i, /Proceed\?/i],
    respuestaConfirmacion: "n",
    confirmacionesLegitimas: [],
  },
};

const GENERICO_PROMPT = /[#>]\s*$/;
const GENERICO_PROMPT_ANIDADO = /\([^()]*\)\s*[#>]\s*$|^\s*\[[^\]]+\]\s*$/;

function genericoEsSubModo(linea: string): boolean {
  const texto = limpiarPrompt(linea);
  if (!parecePrompt(texto)) return false;

  if (/^\[[^\]]*@[^\]]*\]\s*\/\S+/.test(texto)) return true;

  if (/^\[(?!.*@)[^\]]+\]\s*[>#]?\s*$/.test(texto)) return true;
  if (!/[#>\]]$/.test(texto)) return false;
  const cuerpo = texto.replace(/[#>\]]+$/, "").trim();
  if (!cuerpo) return false;

  if (/^\[[^\]]*@[^\]]*\]$/.test(cuerpo)) return false;
  if (!/[\])]$/.test(cuerpo)) return false;
  if (/^\([^()]*\)$/.test(cuerpo) && !/config/i.test(cuerpo)) return false;
  return true;
}

function genericoEsPrompt(linea: string): boolean {
  const texto = limpiarPrompt(linea);
  if (!parecePrompt(texto)) return false;
  if (/^\[[^\]]*@[^\]]*\]\s*\/\S+/.test(texto)) return true;
  if (/[#>\]]$/.test(texto)) return true;
  const ultimo = texto.split(/\s+/).pop() ?? "";
  return /[$%>]$/.test(ultimo);
}

const CONSERVATIVE_PROFILE: VendorProfile = {
  id: "conservative",
  label: "Genérico (sin vendor identificado)",
  prompt: {
    user: GENERICO_PROMPT,
    enable: GENERICO_PROMPT,
    config: GENERICO_PROMPT_ANIDADO,
    isNested: genericoEsSubModo,
    isPrompt: genericoEsPrompt,
  },
  transiciones: {

    aUsuario: null,
    aPrivilegiado: null,
    aConfig: null,
    guardarConfig: null,
    salirDeConfig: null,
  },

  paginador: [/--More--/, /----\s*More\s*----/, /\(END\)/],
  preambulo: {
    sinPaginacion: null,
    sinLookupDns: null,
  },
  eol: "\r",
  abortKey: null,
  sondeo: null,
  dialogos: {
    promptPatrones: [],
    confirmacionPatrones: [
      /\[[\w/ -]*(?:yes\/no|y\/n)[\w/ -]*\]/i,
      /\[[\w/ -]*confirm[\w/ -]*\]/i,
      /\(\s*y\/n\s*\)/i,
    ],
    respuestaConfirmacion: "no",

    confirmacionesLegitimas: [],
  },
};

export const VENDOR_PROFILES: Readonly<Record<VendorId, VendorProfile>> = {
  cisco: CISCO_PROFILE,
  huawei: HUAWEI_PROFILE,
  mikrotik: MIKROTIK_PROFILE,
  aruba: ARUBA_PROFILE,
  junos: JUNOS_PROFILE,
  fortios: FORTIOS_PROFILE,
  h3c: H3C_PROFILE,
  panos: PANOS_PROFILE,
  arista: ARISTA_PROFILE,
  vyos: VYOS_PROFILE,
  conservative: CONSERVATIVE_PROFILE,
};

/**
 * `TypeDevice` del enum → perfil de fabricante.
 *
 * Antes sólo reconocía cuatro marcas y `JUNIPER` no estaba: un switch Juniper caía al
 * perfil conservador, que no pagina ni sabe guardar la configuración. Ahora están las
 * cinco marcas nuevas (FORTIGATE, H3C, PALO_ALTO, ARISTA, VYOS) y JUNIPER → `junos`.
 */
const DEVICE_A_PERFIL: Record<string, VendorId> = {
  CISCO: "cisco",
  HUAWEI: "huawei",
  ARUBA: "aruba",
  MIKROTIK: "mikrotik",
  JUNIPER: "junos",
  JUNOS: "junos",
  FORTIGATE: "fortios",
  H3C: "h3c",
  PALO_ALTO: "panos",
  ARISTA: "arista",
  VYOS: "vyos",
};

export const CONSERVADOR: VendorProfile = CONSERVATIVE_PROFILE;

export const CISCO: VendorProfile = CISCO_PROFILE;

export function getVendorProfile(id?: string | null): VendorProfile {
  const clave = String(id ?? "").trim().toLowerCase() as VendorId;
  return VENDOR_PROFILES[clave] ?? CONSERVADOR;
}

export function detectVendorIdFromPrompt(
  prompt?: string | null,
): VendorId | null {
  const texto = limpiarPrompt(prompt);
  if (!parecePrompt(texto)) return null;

  if (MIKROTIK_RAIZ.test(texto) || MIKROTIK_MENU.test(texto)) return "mikrotik";

  if (JUNOS_SUBMODO.test(texto) || JUNOS_HOST_PROMPT.test(texto)) return "junos";

  if (HUAWEI_VISTA.test(texto) || /^<[^<>]+>\s*$/.test(texto)) return "huawei";

  if (ARUBA_PROMPT.test(texto)) return "aruba";

  if (/\(config[^)]*\)#\s*$/.test(texto)) return "cisco";

  return null;
}

export interface VendorResolutionInput {

  typeDevice?: string | null;

  prompt?: string | null;
}

export function resolveVendorId(input: VendorResolutionInput = {}): VendorId {
  const declarado = String(input.typeDevice ?? "")
    .trim()
    .toUpperCase();

  const porMarca = DEVICE_A_PERFIL[declarado];
  if (porMarca) return porMarca;

  const detectado = detectVendorIdFromPrompt(input.prompt);
  if (detectado) return detectado;

  return "conservative";
}

export function resolveVendorProfile(
  input: VendorResolutionInput = {},
): VendorProfile {
  return VENDOR_PROFILES[resolveVendorId(input)];
}

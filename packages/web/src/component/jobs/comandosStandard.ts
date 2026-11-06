import { getDictionary } from "@/i18n";
import { LOCALE_COOKIE } from "@/i18n/types";
import { interp } from "@/i18n/interp";

function diccionario() {
  const esEn =
    typeof document !== "undefined" &&
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=en(?:;|$)`).test(document.cookie);
  return getDictionary(esEn ? "en" : "es");
}

export const MAX_COMANDOS_STANDARD = 30;

export const COMANDOS_DE_CIERRE: readonly string[] = [
  "exit",
  "quit",
  "logout",
  "disconnect",
  "close",
];

export interface DispositivoStandard {
  protocol?: string | null;
  typeDevice?: string | null;
}

function normalizarComando(comando: string): string {
  let normalizado = String(comando ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (normalizado.startsWith("do ")) normalizado = normalizado.slice(3).trim();
  return normalizado;
}

function aLista(texto: string | null | undefined): string[] {
  return String(texto ?? "")
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);
}

export function comandosATexto(comandos: readonly string[]): string {
  return (comandos ?? [])
    .map((comando) => String(comando ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export function extraerComandos(payload: string | null | undefined): string[] {
  const bruto = String(payload ?? "").trim();
  if (!bruto) return [];

  if (bruto.startsWith("{") || bruto.startsWith("[")) {
    try {
      const dato: unknown = JSON.parse(bruto);
      if (Array.isArray(dato)) return aLista(dato.join("\n"));
      if (dato && typeof dato === "object") {
        const contenedor = dato as Record<string, unknown>;
        const fuente =
          contenedor.commands ?? contenedor.comandos ?? contenedor.command;
        if (Array.isArray(fuente)) return aLista(fuente.join("\n"));
        if (typeof fuente === "string") return aLista(fuente);
      }
    } catch {

    }
  }

  return aLista(bruto);
}

export function comandosQueCierranSesion(
  texto: string | null | undefined,
): string[] {
  return aLista(texto).filter((comando) =>
    COMANDOS_DE_CIERRE.includes(normalizarComando(comando)),
  );
}

export function motivoDispositivoNoSoportado(
  dispositivo: DispositivoStandard | null | undefined,
): string | null {
  const protocolo = dispositivo?.protocol ?? "";
  const tipo = dispositivo?.typeDevice ?? "";

  if (protocolo === "SSH" || protocolo === "TELNET" || protocolo === "SERIAL") {
    return null;
  }
  if (protocolo === "SIMULATION" && tipo === "PACKET_TRACER") return null;
  if (protocolo === "SIMULATION" && tipo === "GNS3") {
    return diccionario().jobs.standardNotSupported.gns3;
  }
  if (protocolo === "SIMULATION") {
    return interp(diccionario().jobs.standardNotSupported.simulation, { tipo });
  }
  return interp(diccionario().jobs.standardNotSupported.protocol, { protocolo });
}

export function admiteComandosStandard(
  dispositivo: DispositivoStandard | null | undefined,
): boolean {
  return motivoDispositivoNoSoportado(dispositivo) === null;
}

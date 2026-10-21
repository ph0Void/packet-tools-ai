import { prismaClient } from "@/prisma/lib/PrismaClient";
import { invokeTurn } from "@/agent/deep/turn";
import { limpiarResultadosDeDelegacion } from "@/agent/deep/delegacionStream";
import { resetBudgetCounters } from "@/agent/deep/budgetMiddleware";
import {
  registrarFinDeTurno,
  registrarInicioDeTurno,
  type ContextoLogAgente,
} from "@/agent/deep/agentLog";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import { Logger } from "@/utils/Logger";
import { formatDate } from "@/utils/FormatDate";
import { envConfig } from "@/config/EnvConfig";
import { requestContext } from "@/utils/RequestContext";
import { calcularProximaEjecucion } from "@/service/JobScheduler";
import {
  ejecutarComandosDeJob,
  MAX_SALIDA_STANDARD,
} from "@/service/CronCommandRunner";

export interface ResultadoEjecucion {
  jobId: string;
  nombre: string;

  ejecutado: boolean;
  ok: boolean;
  error?: string;
  duracionMs: number;
  salida?: string;
}

const MAX_SALIDA = MAX_SALIDA_STANDARD;

function recortar(texto: string): string {
  const limpio = String(texto ?? "");
  if (limpio.length <= MAX_SALIDA) return limpio;
  return `${limpio.slice(0, MAX_SALIDA)}… [salida recortada: ${limpio.length} caracteres]`;
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "error desconocido");
}

/** Texto plano del último mensaje del turno, tolerando contenido por bloques. */
function textoDeUltimoMensaje(mensajes: BaseMessage[]): string {
  const ultimo = mensajes[mensajes.length - 1];
  if (!ultimo) return "";
  const contenido = (ultimo as { content?: unknown }).content;
  if (typeof contenido === "string") return contenido;
  if (Array.isArray(contenido)) {
    return contenido
      .map((bloque) =>
        bloque && typeof bloque === "object" && "text" in bloque
          ? String((bloque as { text?: unknown }).text ?? "")
          : "",
      )
      .join("");
  }
  return String(contenido ?? "");
}

class CronExecutorService {

  async executeJob(cronJobId: string): Promise<ResultadoEjecucion> {
    const inicio = Date.now();
    const vacio = (
      nombre: string,
      ejecutado: boolean,
      ok: boolean,
      error?: string,
      salida?: string,
    ): ResultadoEjecucion => ({
      jobId: cronJobId,
      nombre,
      ejecutado,
      ok,
      duracionMs: Date.now() - inicio,
      ...(error ? { error } : {}),
      ...(salida ? { salida } : {}),
    });

    const job = await prismaClient.cronJob.findUnique({
      where: { id: cronJobId },
      include: { topology: true, deviceProvider: true },
    });

    if (!job) {
      Logger.warning({
        message: `[CRON_EXECUTOR_SERVICE] El job '${cronJobId}' ya no existe: nada que ejecutar.`,
      });
      return vacio("", false, false, "El trabajo ya no existe.");
    }
    if (!job.isActive) {
      Logger.info({
        message: `[CRON_EXECUTOR_SERVICE] '${job.name}' (${job.id}) está inactivo: no se ejecuta.`,
      });
      return vacio(job.name, false, false, "El trabajo está desactivado.");
    }

    const esUnaVez = job.cronExpression == null;
    const nombre = job.name;

    await prismaClient.cronJob.update({
      where: { id: cronJobId },
      data: { status: "RUNNING", lastRun: new Date() },
    });

    let contexto: ContextoLogAgente | null = null;
    let inicioTurnoCron = Date.now();

    let turnoCerrado = false;

    try {
      let salida: string | undefined;
      if (job.actionType === "INTELLIGENT") {
        salida = await this.ejecutarInteligente(
          job,
          (contextoCron, prompt) => {
            contexto = contextoCron;
            inicioTurnoCron = Date.now();
            registrarInicioDeTurno(contextoCron, { prompt, ruta: "supervisor" });
          },
          (contextoCron, salidaTurno) => {
            registrarFinDeTurno(contextoCron, {
              resultado: "completo",
              duracionMs: Date.now() - inicioTurnoCron,

              toolCalls: 0,
              respuesta: salidaTurno,
            });
            turnoCerrado = true;
          },
        );
      } else {
        const resultado = await ejecutarComandosDeJob({
          id: job.id,
          name: job.name,
          payload: job.payload,
          deviceProviderId: job.deviceProviderId,
          deviceProvider: job.deviceProvider
            ? {
                id: job.deviceProvider.id,
                name: job.deviceProvider.name,
                protocol: job.deviceProvider.protocol,
                typeDevice: job.deviceProvider.typeDevice,
              }
            : null,
        });
        if (!resultado.ok) {
          throw new Error(resultado.error ?? "STANDARD terminó sin ejecutar nada.");
        }
        salida = resultado.salida;
      }

      const salidaFinal = recortar(salida ?? "");

      await this.escribirLog({
        ...(job.topologyId ? { topologyId: job.topologyId } : {}),
        level: "CRON_EXECUTION",
        title: `CronJob ${job.actionType === "INTELLIGENT" ? "Inteligente" : "Estándar"}: ${job.name}`,
        content:
          job.actionType === "INTELLIGENT"
            ? `Resultado de la IA:\n${salidaFinal}`
            : salidaFinal,

        userId: job.topology?.ownerId ?? job.userId ?? null,
      });

      await this.persistirEstado(job, esUnaVez, "SUCCESS");
      Logger.info({
        message: "[CRON_EXECUTOR_SERVICE] CronJob ejecutado exitosamente",
        data: { id: job.id, name: job.name, date: new Date(), actionType: job.actionType },
      });

      return vacio(nombre, true, true, undefined, salidaFinal);
    } catch (error) {
      const mensaje = mensajeDe(error);
      Logger.error({
        message: `[CRON_EXECUTOR_SERVICE] CronJob '${job.name}' (${job.id}) falló: ${mensaje}`,
      });

      await this.persistirEstado(job, esUnaVez, "FAILED");

      if (contexto && !turnoCerrado) {
        registrarFinDeTurno(contexto, {
          resultado: "error",
          duracionMs: Date.now() - inicioTurnoCron,
          toolCalls: 0,
          error: mensaje,
        });
      }

      await this.escribirLog({
        ...(job.topologyId ? { topologyId: job.topologyId } : {}),
        level: "ERROR",
        title: `Falló CronJob: ${job.name}`,
        content: `Error al intentar ejecutar el cron job: Id: ${job.id} - Titulo: ${job.name} - Hora: ${formatDate(job.createdAt)} - Motivo: ${mensaje}`,
        userId: job.topology?.ownerId ?? job.userId ?? null,
      });

      return vacio(nombre, true, false, mensaje);
    }
  }

  private async escribirLog(data: {
    topologyId?: string;
    level: string;
    title: string;
    content: string;
    userId: string | null;
  }): Promise<void> {
    try {
      await prismaClient.log.create({ data });
    } catch (error) {
      Logger.error({
        message: "[CRON_EXECUTOR_SERVICE] No se pudo escribir el log del cron.",
        data: mensajeDe(error),
      });
    }
  }

  private async persistirEstado(
    job: { id: string; name: string; cronExpression: string | null; scheduledAt: Date | null },
    esUnaVez: boolean,
    resultado: "SUCCESS" | "FAILED",
  ): Promise<void> {

    try {
      if (esUnaVez) {

        await prismaClient.cronJob.update({
          where: { id: job.id },
          data:
            resultado === "SUCCESS"
              ? { status: "SUCCESS", isActive: false, nextRun: null }
              : { status: "FAILED", isActive: false, nextRun: null },
        });
        return;
      }

      const siguiente = calcularProximaEjecucion({
        id: job.id,
        name: job.name,
        cronExpression: job.cronExpression,
        scheduledAt: job.scheduledAt,
        isActive: true,
      });
      await prismaClient.cronJob.update({
        where: { id: job.id },
        data: { status: "PENDING", isActive: true, nextRun: siguiente },
      });
    } catch (error) {
      Logger.error({
        message: `[CRON_EXECUTOR_SERVICE] No se pudo guardar el estado final del job '${job.id}'.`,
        data: mensajeDe(error),
      });
    }
  }

  private async ejecutarInteligente(
    job: {
      id: string;
      name: string;
      prompt: string | null;
      deviceProvider: { typeDevice: string | null } | null;
      topology: { ownerId: string } | null;
    },
    alIniciar: (contexto: ContextoLogAgente, prompt: string) => void,
    alTerminar: (contexto: ContextoLogAgente, salida: string) => void,
  ): Promise<string> {
    if (!job.prompt) {
      throw new Error("El CronJob inteligente requiere un prompt de instrucción.");
    }
    const prompt = job.prompt;

    // El `userId` de la traza se resuelve igual que en `escribirLog` (topología → dueño del
    // job → null). Antes iba siempre `null`, así que la traza de una automatización
    // inteligente quedaba invisible para su autor: sólo la veía el ADMIN.
    const autorDelLog = job.topology?.ownerId ?? null;

    const contexto: ContextoLogAgente = {
      userId: autorDelLog,
      chatId: `cron-${job.id}`,
      threadId: `cron-${job.id}`,
      actor: { username: "cron", role: "ADMIN" },
      origen: "cron",
      modelo: job.deviceProvider?.typeDevice,
    };
    alIniciar(contexto, prompt);

    const messageId = String(Date.now());
    const threadId = `cron-${job.id}:${messageId}`;
    let salida = "";

    try {
      const resultado = await requestContext.run(
        { id: "system", username: "cron", role: "ADMIN" },
        async () =>
          invokeTurn({
            messages: [new HumanMessage(prompt)],
            chatId: `cron-${job.id}`,
            messageId,
            role: "ADMIN",
            ragPrefetched: false,
            webRequired: false,
            origin: "chat",
            // Cron no usa el stream del chat: sin esta cota el turno heredaría el plazo
            // por defecto y, si el proveedor se queda colgado, la automatización se queda
            // "RUNNING" para siempre bloqueando el guard de solape.
            turnTimeoutMs: envConfig.AGENT_TURN_TIMEOUT_MS,
          }),
      );

      salida = textoDeUltimoMensaje(resultado.messages);
      alTerminar(contexto, salida);
      return salida;
    } catch (error) {
      // El `executeJob` ya atrapa y persiste el FAILED, pero es él quien escribe el log de
      // error del turno. Si algo falla ENTRE medias, al menos queda constancia aquí.
      Logger.error({
        message: `[CRON_EXECUTOR_SERVICE] Turno inteligente de '${job.name}' (${job.id}) abortado.`,
        data: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // `invokeTurn` no consume el replay de delegaciones (eso es del stream del chat),
      // así que el resultado capturado por `taskResultMiddleware` se quedaba en el mapa
      // del módulo hasta el desalojo por capacidad: una fuga por cada ejecución.
      limpiarResultadosDeDelegacion(threadId);
      resetBudgetCounters(threadId);
    }
  }
}

export const cronExecutorService = new CronExecutorService();

import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestUser {
  id: string;
  username: string;
  role: string;

  autonomous?: boolean;

  // Modo planificación de un turno `@plan`: el middleware de plan filtools mutantes y el
  // supervisor investiga + propone sin ejecutar. Se puebla desde turnoStream con la
  // mención resuelta; cron y los evals no lo pasan (undefined = modo normal).
  planRequired?: boolean;

  approvalChannel?: {
    emit: (event: string, data: unknown) => void;
    chatId: string;
  };

  terminalSessionId?: string;

  terminalContextLines?: number;

  terminalOrigin?: "terminal" | "chat";

  mentionedProviderId?: string | null;

  connectionProviderId?: string | null;

  connectionName?: string | null;

  connectionProtocol?: string | null;

  connectionFingerprint?: string | null;

  gns3ProjectId?: string | null;

  abortSignal?: AbortSignal;
}

export const requestContext = new AsyncLocalStorage<RequestUser>();

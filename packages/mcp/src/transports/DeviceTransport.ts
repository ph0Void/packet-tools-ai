export type TransportProtocol = "SSH" | "TELNET" | "SERIAL";

export interface ConnectionOptions {
  protocol: TransportProtocol;
  host?: string | null;
  port?: number | null;
  serialPort?: string | null;
  baudRate?: number | null;
  username?: string | null;
  password?: string | null;
  privateKey?: string | null;
  providerId?: string | null;
  typeDevice?: string | null;
}

export interface CommandResult {
  output: string;
  prompt: string | null;
  vendorId: string;
  vendorLabel: string;
  vendorDetected: boolean;
  durationMs: number;
}

export interface DeviceTransport {
  readonly protocol: TransportProtocol;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendCommand(command: string): Promise<void>;
  readOutput(options?: { idleMs?: number; maxMs?: number }): Promise<string>;
}

export interface ExecutionOptions {
  idleMs?: number;
  maxMs?: number;
  forcedVendorId?: string | null;
  skipPreamble?: boolean;
}

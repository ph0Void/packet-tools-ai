"use client";

import { Database, Loader2, Radio } from "lucide-react";
import { useT } from "@/hooks/useT";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const BADGE_STYLES: Record<ConnectionStatus, string> = {
  connected: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
  connecting: "bg-amber-500/10 border-amber-500/20 text-amber-500",
  disconnected: "bg-muted border-border text-muted-foreground",
};

export default function BridgeStatusBadge({
  status,
}: {
  status: ConnectionStatus;
}) {
  const t = useT();
  const labels: Record<ConnectionStatus, string> = {
    connected: t.workspace.bridge.live,
    connecting: t.workspace.bridge.connecting,
    disconnected: t.workspace.bridge.local,
  };
  const className = BADGE_STYLES[status];

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold font-mono transition-all ${className}`}
    >
      {status === "connected" && (
        <Radio className="w-3 h-3 animate-pulse" aria-hidden="true" />
      )}
      {status === "connecting" && (
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
      )}
      {status === "disconnected" && (
        <Database className="w-3 h-3" aria-hidden="true" />
      )}
      <span>{labels[status]}</span>
    </div>
  );
}

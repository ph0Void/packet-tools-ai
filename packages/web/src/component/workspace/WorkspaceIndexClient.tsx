"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Network, Radio, AlertTriangle, Loader2 } from "lucide-react";
import { useCiscoSocket } from "@/hooks/useCiscoSocket";
import { useTopologyStore } from "@/store/topologyStore";
import WorkspaceContainer from "./WorkspaceContainer";
import BridgeStatusBadge from "./BridgeStatusBadge";
import { extractLiveTopology } from "./topology-json";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";

interface WorkspaceIndexClientProps {
  canEdit?: boolean;
}

export default function WorkspaceIndexClient({
  canEdit = false,
}: WorkspaceIndexClientProps) {
  const t = useT();
  const { status, emitToolCall } = useCiscoSocket();
  const setTopology = useTopologyStore((s) => s.setTopology);
  const [showLive, setShowLive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConnectLive = useCallback(async () => {
    setIsSyncing(true);
    try {
      const payload = await emitToolCall("getNetwork");
      const live = extractLiveTopology(payload);
      setTopology({ devices: live.devices, links: live.links });

      if (live.devices.length === 0 && live.links.length === 0) {
        toast.warning(t.workspace.index.toasts.empty);
      } else {
        toast.success(
          interp(t.workspace.index.toasts.loaded, {
            devices: live.devices.length,
            links: live.links.length,
          })
        );
      }
      setShowLive(true);
    } catch (error) {
      console.error(error);
      notifyError(
        error instanceof Error
          ? error.message
          : t.workspace.index.toasts.readError
      );
    } finally {
      setIsSyncing(false);
    }
  }, [emitToolCall, setTopology, t]);

  if (showLive) {
    return <WorkspaceContainer canEdit={canEdit} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 p-4 sm:p-8 text-center text-foreground bg-background relative z-10">
      <BridgeStatusBadge status={status} />

      <div className="relative">
        <div className="rounded-full bg-muted p-5 border border-border shadow-inner">
          <Network
            className={`w-12 h-12 text-muted-foreground ${
              status === "connected" ? "animate-pulse text-sky-400" : ""
            }`}
          />
        </div>
        <div
          className={`absolute -bottom-1 -right-1 rounded-full w-4 h-4 border-2 border-background transition-colors ${
            status === "connected"
              ? "bg-emerald-500"
              : status === "connecting"
                ? "bg-amber-500 animate-pulse"
                : "bg-zinc-500"
          }`}
        />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight">
          {t.workspace.index.emptyTitle}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mx-auto">
          {t.workspace.index.emptyDescription}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-2 min-w-[200px] justify-center w-full sm:w-auto px-4 sm:px-0">
        {status === "connected" ? (
          <Button
            onClick={handleConnectLive}
            disabled={isSyncing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer w-full sm:w-auto"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.workspace.index.syncing}
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 animate-pulse" />
                {t.workspace.index.connectLive}
              </>
            )}
          </Button>
        ) : status === "connecting" ? (
          <Button
            disabled
            variant="outline"
            className="border-amber-500/30 text-amber-500 bg-amber-500/5 font-semibold gap-2 w-full sm:w-auto"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            {t.workspace.index.connecting}
          </Button>
        ) : (
          <Button
            disabled
            variant="outline"
            className="border-rose-500/30 text-rose-500/70 bg-rose-500/5 font-semibold gap-2 w-full sm:w-auto"
          >
            <AlertTriangle className="w-4 h-4" />
            {t.workspace.index.notDetected}
          </Button>
        )}

        <Button variant="outline" asChild className="cursor-pointer w-full sm:w-auto">
          <Link href="/dashboard/topology">
            {t.workspace.index.savedTopologies}
          </Link>
        </Button>
      </div>
    </div>
  );
}

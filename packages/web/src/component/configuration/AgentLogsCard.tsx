"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import { updateAgentLogsEnabledAction } from "@/action/ConfigAction";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/hooks/useT";

interface AgentLogsCardProps {
  initialEnabled: boolean;
}

export default function AgentLogsCard({ initialEnabled }: AgentLogsCardProps) {
  const t = useT();
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);

  const [lastInitial, setLastInitial] = useState(initialEnabled);
  if (lastInitial !== initialEnabled && !pending) {
    setLastInitial(initialEnabled);
    setEnabled(initialEnabled);
  }

  const handleToggle = async (next: boolean) => {
    const previous = enabled;
    setEnabled(next);
    setPending(true);
    try {
      const result = await updateAgentLogsEnabledAction(next);
      if (result.success) {
        toast.success(result.message);
        playSound("update");
        router.refresh();
      } else {
        setEnabled(previous);
        notifyError(
          result.message || t.configuration.agentLogs.error,
        );
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {t.configuration.agentLogs.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t.configuration.agentLogs.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            {pending
              ? t.configuration.agentLogs.saving
              : enabled
                ? t.configuration.agentLogs.enabled
                : t.configuration.agentLogs.disabled}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={(checked: boolean) => void handleToggle(checked)}
            disabled={pending}
            aria-label={t.configuration.agentLogs.aria}
          />
          {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>
    </section>
  );
}

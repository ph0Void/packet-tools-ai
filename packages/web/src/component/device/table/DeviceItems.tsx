"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Edit2, Loader2, Save, Terminal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";
import type { DeviceProvider } from "@/service/DeviceProviderService";

interface DeviceItemsProps {
  device: DeviceProvider;
  canManage: boolean;
  testing: boolean;
  onEdit: (device: DeviceProvider) => void;
  onDelete: (device: DeviceProvider) => void;
  onTest: (device: DeviceProvider) => void;

  onKeep: (device: DeviceProvider) => void;
}

function getStatusDot(status: string): string {
  switch (status.toUpperCase()) {
    case "ONLINE":
      return "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60";
    case "UNREACHABLE":
      return "bg-rose-400 shadow-[0_0_6px] shadow-rose-400/60";
    default:
      return "bg-zinc-400";
  }
}

function getStatusLabel(status: string): string {
  const known = ["ONLINE", "OFFLINE", "UNREACHABLE"];
  const upper = status.toUpperCase();
  return known.includes(upper) ? upper : (status || "OFFLINE");
}

function getEndpoint(device: DeviceProvider): string {
  if (device.protocol === "SERIAL") {
    return device.serialPort
      ? `${device.serialPort} @ ${device.serialBaudrate ?? 9600} baud`
      : "—";
  }
  if (device.host) {
    return device.port ? `${device.host}:${device.port}` : device.host;
  }
  return "—";
}

export default function DeviceItems({
  device,
  canManage,
  testing,
  onEdit,
  onDelete,
  onTest,
  onKeep,
}: DeviceItemsProps) {
  const t = useT();
  const handleLaunchTerminal = () => {
    sessionStorage.setItem("pt-selected-device", device.id);
  };

  return (
    <tr className="hover:bg-muted/40 transition-colors bg-card">
      <td className="py-3.5 px-6 text-sm font-semibold text-foreground whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          <span
            className={cn("h-2 w-2 rounded-full shrink-0", getStatusDot(device.status))}
            aria-hidden="true"
          />
          {device.name}
          {device.isTemporary && (
            <Badge
              variant="outline"
              className="h-4 border-amber-500/40 bg-amber-500/10 px-1.5 text-[9px] font-medium text-amber-600 dark:text-amber-400"
            >
              {t.devices.list.temporary}
            </Badge>
          )}
        </span>
      </td>

      <td className="py-3.5 px-6 whitespace-nowrap">
        <Badge variant="outline" className="font-mono">
          {device.typeDevice}
        </Badge>
      </td>

      <td className="py-3.5 px-6 whitespace-nowrap">
        <Badge variant="secondary" className="font-mono">
          {device.protocol}
        </Badge>
      </td>

      <td className="py-3.5 px-6 text-sm text-muted-foreground font-mono whitespace-nowrap max-w-[220px] truncate">
        {getEndpoint(device)}
      </td>

      <td className="py-3.5 px-6 text-xs font-medium uppercase tracking-wider whitespace-nowrap">
        <span
          className={cn(
            "text-muted-foreground",
            device.status.toUpperCase() === "ONLINE" && "text-emerald-500 dark:text-emerald-400",
            device.status.toUpperCase() === "UNREACHABLE" && "text-rose-500 dark:text-rose-400"
          )}
        >
          {getStatusLabel(device.status)}
        </span>
      </td>

      <td className="py-3.5 px-6 text-sm whitespace-nowrap">
        <div className="flex justify-end gap-1.5">
          <Button asChild variant="outline" size="sm" className="h-7 gap-1 text-xs cursor-pointer">
            <Link href="/dashboard/terminal" onClick={handleLaunchTerminal}>
              <Terminal />
              {t.devices.list.terminal}
            </Link>
          </Button>

          {canManage && (
            <>
              {device.isTemporary && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  aria-label={interp(t.devices.list.actions.keepAria, {
                    name: device.name,
                  })}
                  title={t.devices.list.actions.keep}
                  onClick={() => onKeep(device)}
                >
                  <Save />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer"
                aria-label={t.devices.list.actions.test}
                title={t.devices.list.actions.test}
                onClick={() => onTest(device)}
                disabled={testing}
              >
                {testing ? <Loader2 className="animate-spin" /> : <Activity />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer"
                aria-label={interp(t.devices.list.actions.editAria, {
                  name: device.name,
                })}
                title={t.devices.list.actions.edit}
                onClick={() => onEdit(device)}
              >
                <Edit2 />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                aria-label={interp(t.devices.list.actions.deleteAria, {
                  name: device.name,
                })}
                title={t.devices.list.actions.delete}
                onClick={() => onDelete(device)}
              >
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

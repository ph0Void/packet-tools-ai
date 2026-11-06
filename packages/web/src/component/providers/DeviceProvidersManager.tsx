"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Router } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import { useT } from "@/hooks/useT";

interface DeviceProviderItem {
  id: string;
  name: string;
  typeDevice: string;
  protocol: string;
  host: string | null;
  port: number | null;
  serialPort: string | null;
  serialBaudrate: number | null;
  username: string | null;
  password?: string | null;
  status: string;
}

/** Espejo del enum `TypeDevice` de Prisma (misma lista que el diálogo de Conexiones). */
const TYPE_DEVICE_OPTIONS = [
  { value: "PACKET_TRACER", label: "Packet Tracer" },
  { value: "GNS3", label: "GNS3 Server" },
  { value: "CISCO", label: "Cisco IOS" },
  { value: "HUAWEI", label: "Huawei VRP" },
  { value: "JUNIPER", label: "Juniper JunOS" },
  { value: "ARUBA", label: "Aruba OS" },
  { value: "MIKROTIK", label: "MikroTik RouterOS" },
  { value: "FORTIGATE", label: "FortiGate FortiOS" },
  { value: "H3C", label: "H3C Comware" },
  { value: "PALO_ALTO", label: "Palo Alto PAN-OS" },
  { value: "ARISTA", label: "Arista EOS" },
  { value: "VYOS", label: "VyOS / Vyatta" },
  { value: "GENERIC", label: "Genérico" },
] as const;

interface DeviceProvidersManagerProps {
  canManage?: boolean;
}

export default function DeviceProvidersManager({
  canManage = true,
}: DeviceProvidersManagerProps) {
  const t = useT();
  const providers = t.devices.providers;
  const typeLabel = (value: string) =>
    value === "GENERIC"
      ? t.devices.form.typeGeneric
      : (TYPE_DEVICE_OPTIONS.find((o) => o.value === value)?.label ?? value);
  const [devices, setDevices] = useState<DeviceProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] =
    useState<Partial<DeviceProviderItem> | null>(null);

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      if (data.success) {
        setDevices(data.data || []);
      } else {
        notifyError(data.message || providers.toasts.loadFailed);
      }
    } catch {
      notifyError(providers.toasts.fetchFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/devices");
        const data = await res.json();
        if (!active) return;
        if (data.success) {
          setDevices(data.data || []);
        } else {
          notifyError(data.message || providers.toasts.loadFailed);
        }
      } catch {
        if (active) notifyError(providers.toasts.fetchFailed);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [providers.toasts.fetchFailed, providers.toasts.loadFailed]);

  const refreshDevices = async () => {
    setLoading(true);
    await fetchDevices();
  };

  const handleOpenDialog = (device?: DeviceProviderItem) => {
    if (device) {
      setSelectedDevice(device);
    } else {
      setSelectedDevice({
        name: "",
        typeDevice: "CISCO",
        protocol: "SSH",
        host: "192.168.1.1",
        port: 22,
        serialPort: "COM1",
        serialBaudrate: 9600,
        username: "admin",
        password: "",
        status: "ONLINE",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice?.name) {
      notifyError(providers.toasts.nameRequired);
      return;
    }

    try {
      const isEdit = !!selectedDevice.id;
      const url = isEdit ? `/api/devices/${selectedDevice.id}` : "/api/devices";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedDevice),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          isEdit ? providers.toasts.updated : providers.toasts.created,
        );
        playSound(isEdit ? "update" : "create");
        setIsDialogOpen(false);
        refreshDevices();
      } else {
        notifyError(data.message || providers.toasts.saveFailed);
      }
    } catch {
      notifyError(providers.toasts.requestFailed);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(providers.toasts.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success(providers.toasts.deleted);
        setDevices((prev) => prev.filter((d) => d.id !== id));
      } else {
        notifyError(data.message || providers.toasts.deleteFailed);
      }
    } catch {
      notifyError(providers.toasts.deleteError);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {providers.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {providers.subtitle}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> {providers.add}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="p-4">{providers.table.hostname}</th>
                <th className="p-4">{providers.table.type}</th>
                <th className="p-4">{providers.table.protocol}</th>
                <th className="p-4">{providers.table.endpoint}</th>
                <th className="p-4">{providers.table.serial}</th>
                <th className="p-4">{providers.table.username}</th>
                <th className="p-4 text-center">{providers.table.status}</th>
                <th className="p-4 text-right">{providers.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {providers.loading}
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {providers.empty}
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4 font-semibold text-foreground">
                      <span className="flex items-center gap-2">
                        <Router className="w-4 h-4 text-primary" />
                        {d.name}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-mono text-xs">
                        {typeLabel(d.typeDevice)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {d.protocol}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {d.host ? `${d.host}:${d.port || "-"}` : "-"}
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {d.serialPort
                        ? `${d.serialPort} @ ${d.serialBaudrate || 9600}`
                        : "-"}
                    </td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {d.username || "-"}
                    </td>
                    <td className="p-4 text-center">
                      <Badge
                        variant={
                          d.status === "UNREACHABLE"
                            ? "destructive"
                            : d.status === "OFFLINE"
                              ? "outline"
                              : "default"
                        }
                        className="text-xs"
                      >
                        {d.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDialog(d)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(d.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDevice?.id
                ? providers.dialog.editTitle
                : providers.dialog.createTitle}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>{providers.dialog.name}</Label>
                <Input
                  placeholder={providers.dialog.namePlaceholder}
                  value={selectedDevice?.name || ""}
                  onChange={(e) =>
                    setSelectedDevice({
                      ...selectedDevice,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{providers.dialog.type}</Label>
                <Select
                  value={selectedDevice?.typeDevice || "CISCO"}
                  onValueChange={(val) =>
                    setSelectedDevice({ ...selectedDevice, typeDevice: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_DEVICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {typeLabel(opt.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{providers.dialog.protocol}</Label>
                <Select
                  value={selectedDevice?.protocol || "SSH"}
                  onValueChange={(val) =>
                    setSelectedDevice({ ...selectedDevice, protocol: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SSH">SSH</SelectItem>
                    <SelectItem value="TELNET">Telnet</SelectItem>
                    <SelectItem value="SERIAL">
                      {providers.dialog.protocolSerial}
                    </SelectItem>
                    <SelectItem value="SIMULATION">
                      {providers.dialog.protocolSimulation}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedDevice?.protocol !== "SERIAL" ? (
                <>
                  <div className="space-y-2">
                    <Label>{providers.dialog.host}</Label>
                    <Input
                      placeholder={providers.dialog.hostPlaceholder}
                      value={selectedDevice?.host || ""}
                      onChange={(e) =>
                        setSelectedDevice({
                          ...selectedDevice,
                          host: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{providers.dialog.port}</Label>
                    <Input
                      type="number"
                      placeholder="22"
                      value={selectedDevice?.port ?? 22}
                      onChange={(e) =>
                        setSelectedDevice({
                          ...selectedDevice,
                          port: parseInt(e.target.value) || null,
                        })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{providers.dialog.serialPort}</Label>
                    <Input
                      placeholder={providers.dialog.serialPortPlaceholder}
                      value={selectedDevice?.serialPort || ""}
                      onChange={(e) =>
                        setSelectedDevice({
                          ...selectedDevice,
                          serialPort: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{providers.dialog.baudrate}</Label>
                    <Input
                      type="number"
                      placeholder="9600"
                      value={selectedDevice?.serialBaudrate ?? 9600}
                      onChange={(e) =>
                        setSelectedDevice({
                          ...selectedDevice,
                          serialBaudrate: parseInt(e.target.value) || 9600,
                        })
                      }
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>{providers.dialog.username}</Label>
                <Input
                  placeholder="admin"
                  value={selectedDevice?.username || ""}
                  onChange={(e) =>
                    setSelectedDevice({
                      ...selectedDevice,
                      username: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{providers.dialog.password}</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={selectedDevice?.password || ""}
                  onChange={(e) =>
                    setSelectedDevice({
                      ...selectedDevice,
                      password: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t.common.cancel}
              </Button>
              <Button type="submit">{providers.dialog.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

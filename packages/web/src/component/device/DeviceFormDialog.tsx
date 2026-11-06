"use client";

import React, { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import { useT } from "@/hooks/useT";
import {
  saveDeviceProviderAction,
  testDeviceConnectionAction,
  type FormDeviceState,
} from "@/action/DeviceProviderAction";
import type {
  DeviceProvider,
  DeviceTestInput,
} from "@/service/DeviceProviderService";

/**
 * Espejo del enum `TypeDevice` de Prisma. Al añadir marcas al enum hay que añadirlas aquí
 * o el panel de "Conexiones" no deja registrarlas.
 */
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

const PROTOCOL_OPTIONS = [
  { value: "SSH", label: "SSH" },
  { value: "TELNET", label: "Telnet" },
  { value: "SERIAL", label: "Puerto Serial" },
  { value: "SIMULATION", label: "Simulación / API Bridge" },
] as const;

const DEFAULT_PORTS: Record<string, string> = {
  SSH: "22",
  TELNET: "23",
};

const SERIAL_BAUDRATE_OPTIONS = [
  "300",
  "1200",
  "2400",
  "4800",
  "9600",
  "19200",
  "38400",
  "57600",
  "115200",
  "230400",
  "460800",
  "921600",
] as const;

const DEFAULT_SERIAL_BAUDRATE = "9600";

const initialState: FormDeviceState = { success: false, message: "" };

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: DeviceProvider | null;
}

export default function DeviceFormDialog({
  open,
  onOpenChange,
  device,
}: DeviceFormDialogProps) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(
    saveDeviceProviderAction,
    initialState
  );

  const isEdit = !!device;

  const [protocol, setProtocol] = useState<string>(device?.protocol ?? "SSH");
  const [typeDevice, setTypeDevice] = useState<string>(
    device?.typeDevice ?? "CISCO"
  );
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [port, setPort] = useState<string>(
    device?.port != null
      ? String(device.port)
      : (DEFAULT_PORTS[device?.protocol ?? "SSH"] ?? "")
  );
  const [serialBaudrate, setSerialBaudrate] = useState<string>(
    device?.serialBaudrate != null
      ? String(device.serialBaudrate)
      : DEFAULT_SERIAL_BAUDRATE
  );
  const [host, setHost] = useState<string>(device?.host ?? "");
  const [serialPort, setSerialPort] = useState<string>(device?.serialPort ?? "");
  const [username, setUsername] = useState<string>(device?.username ?? "");
  const [password, setPassword] = useState<string>("");

  const handleProtocolChange = (value: string) => {
    setProtocol(value);
    if (value === "SSH") {
      setPort(DEFAULT_PORTS.SSH);
    } else if (value === "TELNET") {
      setPort(DEFAULT_PORTS.TELNET);
    } else if (value === "SERIAL") {
      setSerialBaudrate(DEFAULT_SERIAL_BAUDRATE);
    } else if (value === "SIMULATION") {

      setPort("");
    }
  };

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      playSound(device ? "update" : "create");
      onOpenChange(false);
    } else {
      notifyError(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const buildTestPayload = (): DeviceTestInput | null => {
    const base: DeviceTestInput = {
      providerId: device?.id,
      typeDevice,
      protocol,
    };

    if (typeDevice === "GNS3") {
      if (!host.trim()) {
        notifyError(t.devices.list.toasts.gns3HostRequired);
        return null;
      }
      return { ...base, host: host.trim(), username, password };
    }

    if (typeDevice === "PACKET_TRACER") {
      return base;
    }

    if (protocol === "SERIAL") {
      if (!serialPort.trim()) {
        notifyError(t.devices.list.toasts.serialPortRequired);
        return null;
      }
      return {
        ...base,
        serialPort: serialPort.trim(),
        serialBaudrate: Number(serialBaudrate),
      };
    }

    if (!host.trim()) {
      notifyError(t.devices.list.toasts.hostRequired);
      return null;
    }

    return {
      ...base,
      host: host.trim(),

      ...(protocol === "SIMULATION" ? {} : { port: Number(port) }),
      username,
      password,
    };
  };

  const handleTestConnection = async () => {
    const payload = buildTestPayload();
    if (!payload) return;

    setIsTesting(true);
    try {
      const result = await testDeviceConnectionAction(payload);

      if (result.success) {
        toast.success(result.message);
      } else {
        notifyError(result.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t.devices.form.editTitle : t.devices.form.createTitle}
          </DialogTitle>
          <DialogDescription>
            {protocol === "SSH"
              ? t.devices.form.protocolDescriptions.ssh
              : protocol === "TELNET"
                ? t.devices.form.protocolDescriptions.telnet
                : protocol === "SERIAL"
                  ? t.devices.form.protocolDescriptions.serial
                  : protocol === "SIMULATION"
                    ? t.devices.form.protocolDescriptions.simulation
                    : t.devices.form.description}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={device.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="device-name">{t.devices.form.name}</Label>
              <Input
                id="device-name"
                name="name"
                placeholder={t.devices.form.namePlaceholder}
                defaultValue={device?.name ?? ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t.devices.form.type}</Label>
              <Select
                name="typeDevice"
                value={typeDevice}
                onValueChange={setTypeDevice}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_DEVICE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value === "GENERIC"
                        ? t.devices.form.typeGeneric
                        : opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-protocol">
                {t.devices.form.protocol}
              </Label>
              <Select
                name="protocol"
                value={protocol}
                onValueChange={handleProtocolChange}
              >
                <SelectTrigger id="device-protocol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROTOCOL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value === "SERIAL"
                        ? t.devices.form.protocolSerial
                        : opt.value === "SIMULATION"
                          ? t.devices.form.protocolSimulation
                          : opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {protocol === "SERIAL" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="device-serial-port">
                    {t.devices.form.serialPort}
                  </Label>
                  <Input
                    id="device-serial-port"
                    name="serialPort"
                    placeholder={t.devices.form.serialPortPlaceholder}
                    value={serialPort}
                    onChange={(event) => setSerialPort(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-baudrate">
                    {t.devices.form.baudrate}
                  </Label>
                  <Select
                    name="serialBaudrate"
                    value={serialBaudrate}
                    onValueChange={setSerialBaudrate}
                  >
                    <SelectTrigger id="device-baudrate" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERIAL_BAUDRATE_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(protocol === "SSH" || protocol === "TELNET") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="device-host">{t.devices.form.host}</Label>
                  <Input
                    id="device-host"
                    name="host"
                    placeholder="192.168.1.1"
                    value={host}
                    onChange={(event) => setHost(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-port">{t.devices.form.port}</Label>
                  <Input
                    id="device-port"
                    name="port"
                    type="number"
                    placeholder={protocol === "TELNET" ? "23" : "22"}
                    value={port}
                    onChange={(event) => setPort(event.target.value)}
                    min={1}
                    max={65535}
                    required
                  />
                </div>
              </>
            )}

            {(protocol === "SSH" ||
              protocol === "TELNET" ||
              typeDevice === "GNS3") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="device-username">
                    {t.devices.form.username}
                  </Label>
                  <Input
                    id="device-username"
                    name="username"
                    placeholder="admin"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-password">
                    {t.devices.form.password}
                  </Label>
                  <Input
                    id="device-password"
                    name="password"
                    type="password"
                    placeholder={
                      isEdit ? t.devices.form.passwordUnchanged : "••••••••"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            {protocol === "SIMULATION" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="device-host">{t.devices.form.hostOrUrl}</Label>
                <Input
                  id="device-host"
                  name="host"
                  placeholder="http://localhost:7531"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || isPending}
              className="sm:mr-auto"
            >
              {isTesting && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              {t.devices.form.test}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 data-icon="inline-start" />}
              {isEdit
                ? t.devices.form.saveChanges
                : t.devices.form.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Network, Plus } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import { Button } from "@/components/ui/button";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";
import DeviceTable from "./table/DeviceTable";
import DeviceFormDialog from "./DeviceFormDialog";
import ConfirmDialog from "@/component/ui/ConfirmDialog";
import {
  deleteDeviceProviderAction,
  keepDeviceProviderAction,
  testDeviceConnectionAction,
} from "@/action/DeviceProviderAction";
import type { DeviceProvider } from "@/service/DeviceProviderService";

interface TableDeviceWrapperProps {
  devices: DeviceProvider[];
  canManage: boolean;
}

const DEFAULT_PAGE_SIZE = 10;

export default function TableDeviceWrapper({
  devices,
  canManage,
}: TableDeviceWrapperProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceProvider | null>(
    null,
  );
  const [deletingDevice, setDeletingDevice] = useState<DeviceProvider | null>(
    null,
  );
  const [testingId, setTestingId] = useState<string | null>(null);

  const totalItems = devices.length;
  const totalPages = Math.ceil(totalItems / DEFAULT_PAGE_SIZE) || 1;
  const currentPage = Math.min(
    Number(searchParams.get("page")) || 1,
    totalPages,
  );
  const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
  const paginatedDevices = devices.slice(
    startIndex,
    startIndex + DEFAULT_PAGE_SIZE,
  );

  const handlePageChange = (page: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("page", page.toString());
    const query = current.toString();
    router.push(`/dashboard/connection${query ? `?${query}` : ""}`);
  };

  const handleOpenCreate = () => {
    setEditingDevice(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (device: DeviceProvider) => {
    setEditingDevice(device);
    setFormOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingDevice) return;
    const target = deletingDevice;

    startDeleteTransition(async () => {
      try {
        const result = await deleteDeviceProviderAction(target.id);
        if (result.success) {
          toast.success(result.message || t.devices.list.toasts.deleted);
          setDeletingDevice(null);
          router.refresh();
        } else {
          notifyError(result.message || t.devices.list.toasts.deleteFailed);
        }
      } catch {
        notifyError(t.devices.list.toasts.deleteError);
      }
    });
  };

  const handleTest = async (device: DeviceProvider) => {
    setTestingId(device.id);
    try {
      const result = await testDeviceConnectionAction({
        providerId: device.id,
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        notifyError(result.message);
      }
    } finally {
      setTestingId(null);
    }
  };

  const handleKeep = async (device: DeviceProvider) => {
    try {
      const nombre = device.name.replace(/\s*\(temporal\)\s*$/i, "");
      const result = await keepDeviceProviderAction(device.id, nombre);
      if (result.success) {
        toast.success(result.message || t.devices.list.toasts.kept);
        playSound("update");
        router.refresh();
      } else {
        notifyError(result.message || t.devices.list.toasts.keepFailed);
      }
    } catch {
      notifyError(t.devices.list.toasts.keepError);
    }
  };

  return (
    <div className="space-y-4">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/40 bg-muted/30 p-4 md:p-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Network className="h-5 w-5 text-primary" />
            {t.devices.list.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t.devices.list.subtitle}
          </p>
        </div>

        {canManage && (
          <Button
            onClick={handleOpenCreate}
            className="gap-2 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t.devices.list.new}
          </Button>
        )}
      </div>

      <DeviceTable
        devices={paginatedDevices}
        canManage={canManage}
        testingId={testingId}
        onPageChange={handlePageChange}
        paginationData={{
          currentPage,
          totalPages,
          totalItems,
          limit: DEFAULT_PAGE_SIZE,
        }}
        onEdit={handleOpenEdit}
        onDelete={setDeletingDevice}
        onTest={handleTest}
        onKeep={handleKeep}
      />

      {formOpen && (
        <DeviceFormDialog
          key={editingDevice?.id ?? "nuevo"}
          open={formOpen}
          onOpenChange={setFormOpen}
          device={editingDevice}
        />
      )}

      <ConfirmDialog
        open={!!deletingDevice}
        onOpenChange={(open) => !open && setDeletingDevice(null)}
        title={interp(t.devices.list.deleteTitle, {
          name: deletingDevice?.name ?? t.devices.list.deleteFallbackName,
        })}
        description={t.devices.list.deleteDescription}
        confirmLabel={t.devices.list.deleteConfirm}
        destructive
        pending={isDeletePending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

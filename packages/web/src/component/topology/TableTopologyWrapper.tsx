"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";
import TopologyTable from "./table/TopologyTable";
import TopologyEditDialog from "./TopologyEditDialog";
import ConfirmDialog from "@/component/ui/ConfirmDialog";
import {
  deleteTopologyAction,
  getTopologyByIdAction,
  saveTopologyAction,
} from "@/action/TopologyAction";
import type { TopologyRow } from "./types";

interface TableTopologyWrapperProps {
  initialTopologies: TopologyRow[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
  canManage: boolean;
}

export default function TableTopologyWrapper({
  initialTopologies,
  pagination,
  canManage,
}: TableTopologyWrapperProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [editingTopology, setEditingTopology] = useState<TopologyRow | null>(null);
  const [deletingTopology, setDeletingTopology] = useState<TopologyRow | null>(null);

  const handlePageChange = (page: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("page", page.toString());
    const query = current.toString();
    router.push(`/dashboard/topology${query ? `?${query}` : ""}`);
  };

  const handleEditSubmit = async (
    topology: TopologyRow,
    values: { name: string; description: string }
  ): Promise<boolean> => {
    try {
      const detail = await getTopologyByIdAction(topology.id);
      if (!detail.success || !detail.data) {
        notifyError(detail.message || t.topology.list.toasts.fetchFailed);
        return false;
      }

      const result = await saveTopologyAction(
        values.name,
        values.description,
        detail.data.topologyJson ?? "",
        topology.id
      );

      if (!result.success) {
        notifyError(result.message || t.topology.list.toasts.saveFailed);
        return false;
      }

      toast.success(result.message || t.topology.list.toasts.updated);
      playSound("update");
      startTransition(() => router.refresh());
      return true;
    } catch {
      notifyError(t.topology.list.toasts.updateError);
      return false;
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingTopology) return;
    const target = deletingTopology;

    startTransition(async () => {
      try {
        const result = await deleteTopologyAction(target.id);
        if (result.success) {
          toast.success(result.message || t.topology.list.toasts.deleted);
          setDeletingTopology(null);
          router.refresh();
        } else {
          notifyError(result.message || t.topology.list.toasts.deleteFailed);
        }
      } catch {
        notifyError(t.topology.list.toasts.deleteError);
      }
    });
  };

  return (
    <div className="space-y-4">
      <TopologyTable
        topologies={initialTopologies}
        canManage={canManage}
        onPageChange={handlePageChange}
        paginationData={pagination}
        onEdit={setEditingTopology}
        onDelete={setDeletingTopology}
      />

      <TopologyEditDialog
        topology={editingTopology}
        onOpenChange={(open) => !open && setEditingTopology(null)}
        onSubmit={handleEditSubmit}
      />

      <ConfirmDialog
        open={!!deletingTopology}
        onOpenChange={(open) => !open && setDeletingTopology(null)}
        title={interp(t.topology.list.deleteTitle, {
          name: deletingTopology?.name ?? t.topology.list.deleteFallbackName,
        })}
        description={t.topology.list.deleteDescription}
        confirmLabel={t.topology.list.deleteConfirm}
        destructive
        pending={isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

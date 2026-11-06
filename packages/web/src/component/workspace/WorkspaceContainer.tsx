"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useTopologyStore } from "@/store/topologyStore";
import { useCiscoSocket } from "@/hooks/useCiscoSocket";
import CustomNetworkNode from "./CustomNetworkNode";
import BridgeStatusBadge from "./BridgeStatusBadge";
import DeviceInspector from "./DeviceInspector";
import { extractLiveTopology } from "./topology-json";
import { saveTopologyAction } from "@/action/TopologyAction";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  RefreshCw,
  RotateCcw,
  Eraser,
  Database,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import type { Device, Link as TopologyLink } from "@/types";

interface WorkspaceContainerProps {
  topologyId?: string;
  initialName?: string;
  initialDescription?: string;
  initialDevices?: Device[];
  initialLinks?: TopologyLink[];
  canEdit?: boolean;
}

const nodeTypes = {
  networkNode: CustomNetworkNode,
};

export default function WorkspaceContainer({
  topologyId,
  initialName = "",
  initialDescription = "",
  initialDevices = [],
  initialLinks = [],
  canEdit = false,
}: WorkspaceContainerProps) {
  const t = useT();
  const router = useRouter();
  const { status, emitToolCall } = useCiscoSocket();

  const devices = useTopologyStore((s) => s.devices);
  const links = useTopologyStore((s) => s.links);
  const selectedDeviceId = useTopologyStore((s) => s.selectedDeviceId);
  const setTopology = useTopologyStore((s) => s.setTopology);
  const updateDeviceStatus = useTopologyStore((s) => s.updateDeviceStatus);
  const setSelectedDeviceId = useTopologyStore((s) => s.setSelectedDeviceId);
  const clearStore = useTopologyStore((s) => s.clearStore);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  const hasInitialData =
    initialDevices.length > 0 || initialLinks.length > 0;

  useEffect(() => {
    if (!hasInitialData) return;
    setTopology({ devices: initialDevices, links: initialLinks });
  }, [hasInitialData, initialDevices, initialLinks, setTopology]);

  useEffect(() => {
    const storedId = window.sessionStorage.getItem("pt-selected-device");
    if (!storedId) return;
    const exists = initialDevices.some(
      (d) => d.id === storedId || d.name === storedId
    );
    if (exists) setSelectedDeviceId(storedId);
    window.sessionStorage.removeItem("pt-selected-device");
  }, [initialDevices, setSelectedDeviceId]);

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId || d.name === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  );

  const nodes = useMemo<Node[]>(() => {
    return devices.map((d) => ({
      id: d.id,
      type: "networkNode",
      position: { x: d.x, y: d.y },
      data: d as unknown as Record<string, unknown>,
      selected: d.id === selectedDeviceId,
    }));
  }, [devices, selectedDeviceId]);

  const edges = useMemo<Edge[]>(() => {
    return links.map((l) => ({
      id: l.id,
      source: l.sourceDevice,
      target: l.targetDevice,
      animated: l.status === "up",
      style:
        l.status === "down"
          ? { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "6 4" }
          : { stroke: "#38bdf8", strokeWidth: 2 },
    }));
  }, [links]);

  const handleSyncLive = useCallback(async () => {
    setIsSyncing(true);
    try {
      const payload = await emitToolCall("getNetwork");
      const live = extractLiveTopology(payload);

      if (live.devices.length === 0 && live.links.length === 0) {
        toast.warning(t.workspace.toasts.emptyLive);
        return;
      }

      setTopology({ devices: live.devices, links: live.links });
      toast.success(
        interp(t.workspace.toasts.synced, {
          devices: live.devices.length,
          links: live.links.length,
        })
      );
    } catch (error) {
      console.error(error);
      notifyError(
        error instanceof Error ? error.message : t.workspace.toasts.syncError
      );
    } finally {
      setIsSyncing(false);
    }
  }, [emitToolCall, setTopology, t]);

  const handleSaveTopology = async () => {
    if (!name.trim()) {
      notifyError(t.workspace.toasts.nameRequired);
      return;
    }
    if (devices.length === 0 && links.length === 0) {
      notifyError(t.workspace.toasts.emptyCanvas);
      return;
    }

    setIsSaving(true);
    try {
      const topologyJson = JSON.stringify({ devices, links });
      const result = await saveTopologyAction(
        name,
        description,
        topologyJson,
        topologyId
      );

      if (result.success) {
        toast.success(result.message || t.workspace.toasts.saved);
        playSound(topologyId ? "update" : "create");
        setIsSaveOpen(false);
        router.refresh();
        if (!topologyId && result.data?.id) {
          router.push(`/dashboard/workspace/${result.data.id}`);
        }
      } else {
        notifyError(result.message || t.workspace.toasts.saveError);
      }
    } catch (error) {
      console.error(error);
      notifyError(t.workspace.toasts.saveUnexpected);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCanvas = useCallback(() => {
    clearStore();
    setSelectedDeviceId(null);
    toast.success(t.workspace.toasts.cleared);
  }, [clearStore, setSelectedDeviceId, t]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href="/dashboard/topology">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">
                {t.workspace.header.backToTopologies}
              </span>
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate max-w-[180px] sm:max-w-xs">
              {name || t.workspace.header.newTopology}
            </h1>
            {description ? (
              <p className="text-[10px] text-muted-foreground truncate max-w-[180px] sm:max-w-xs">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BridgeStatusBadge status={status} />

          {status === "connected" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleSyncLive}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="hidden md:inline">
                {t.workspace.header.syncLive}
              </span>
            </Button>
          )}

          {hasInitialData && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={t.workspace.header.reloadTitle}
              onClick={() => router.refresh()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="sr-only">{t.workspace.header.reloadSr}</span>
            </Button>
          )}

          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 hover:text-destructive hover:border-destructive/40"
                onClick={handleClearCanvas}
                disabled={!hasInitialData && devices.length === 0}
              >
                <Eraser className="h-3 w-3" />
                <span className="hidden md:inline">
                  {t.workspace.header.clear}
                </span>
              </Button>

              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setIsSaveOpen(true)}
              >
                <Save className="h-3.5 w-3.5" />
                <span>
                  {topologyId
                    ? t.workspace.header.update
                    : t.workspace.header.save}
                </span>
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 w-full relative min-h-0 bg-muted/10 dark:bg-muted/5">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={canEdit}
          nodesConnectable={false}
          elementsSelectable={true}
          onNodeClick={(_, node) => setSelectedDeviceId(String(node.id))}
          onPaneClick={() => setSelectedDeviceId(null)}
          onNodeDragStop={(_event, node) => {
            if (!canEdit) return;
            const device = devices.find((d) => d.id === node.id);
            if (!device) return;
            updateDeviceStatus(device.name, {
              x: node.position.x,
              y: node.position.y,
            });
          }}
          fitView
          minZoom={0.2}
          maxZoom={2}
          className="w-full h-full"
        >
          <Background
            color="currentColor"
            className="text-muted-foreground/15"
            gap={16}
            size={1}
          />
          <Controls className="!bg-card !border-border !text-foreground" />
          <MiniMap
            nodeColor={() => "var(--primary)"}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="!bg-card !border-border dark:!bg-slate-950"
          />
        </ReactFlow>

        {!canEdit && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card/80 backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Database className="h-3 w-3" />
            {t.workspace.header.readOnly}
          </div>
        )}

        {selectedDevice && (
          <DeviceInspector
            device={selectedDevice}
            onClose={() => setSelectedDeviceId(null)}
          />
        )}
      </div>

      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.workspace.saveDialog.title}</DialogTitle>
            <DialogDescription>
              {t.workspace.saveDialog.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="topology-name"
                className="text-xs font-semibold text-muted-foreground"
              >
                {t.workspace.saveDialog.nameLabel}
              </label>
              <Input
                id="topology-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.workspace.saveDialog.namePlaceholder}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="topology-description"
                className="text-xs font-semibold text-muted-foreground"
              >
                {t.workspace.saveDialog.descriptionLabel}
              </label>
              <Textarea
                id="topology-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.workspace.saveDialog.descriptionPlaceholder}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveOpen(false)}
              disabled={isSaving}
            >
              {t.common.cancel}
            </Button>
            <Button onClick={handleSaveTopology} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.workspace.saveDialog.saving}
                </>
              ) : topologyId ? (
                t.workspace.saveDialog.confirmUpdate
              ) : (
                t.workspace.saveDialog.confirmSave
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

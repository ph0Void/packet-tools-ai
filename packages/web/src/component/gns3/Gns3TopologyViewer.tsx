"use client";

import { useEffect, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { Download, Loader2, Network, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getGns3Projects, getGns3Topology } from "@/service/Gns3Service";
import type { Gns3Project, Gns3Topology } from "@/service/Gns3Service";
import { useT } from "@/hooks/useT";

type Gns3NodeData = {
  name: string;
  nodeType: string;
  status: string;
};

type Gns3FlowNode = Node<Gns3NodeData, "gns3Node">;

function nodeStatusClasses(status: string): string {
  switch (status) {
    case "started":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "stopped":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
}

function projectStatusClasses(status: string): string {
  switch (status) {
    case "opened":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "closed":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "proyecto";
}

function Gns3Node({ data, selected }: NodeProps<Gns3FlowNode>) {
  return (
    <div
      className={cn(
        "relative w-[170px] rounded-lg border border-border bg-card px-3 py-2 shadow-sm transition-colors",
        selected && "border-primary ring-2 ring-primary/50",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-muted-foreground"
      />

      <p className="truncate text-xs font-semibold text-foreground" title={data.name}>
        {data.name}
      </p>
      <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
        {data.nodeType}
      </p>
      <Badge
        variant="outline"
        className={cn("mt-1.5 font-medium", nodeStatusClasses(data.status))}
      >
        {data.status}
      </Badge>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-muted-foreground"
      />
    </div>
  );
}

const nodeTypes = { gns3Node: Gns3Node } satisfies NodeTypes;

function Gns3TopologyViewerInner() {
  const { fitView } = useReactFlow();
  const t = useT();
  const gns3 = t.devices.gns3;

  const [projects, setProjects] = useState<Gns3Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [topology, setTopology] = useState<Gns3Topology | null>(null);

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [isLoadingTopology, setIsLoadingTopology] = useState(false);
  const [topologyError, setTopologyError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [projectsReloadKey, setProjectsReloadKey] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const topologyRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setIsLoadingProjects(true);
      setProjectsError(null);

      const result = await getGns3Projects();
      if (cancelled) return;

      if (result.success) {
        setProjects(result.data ?? []);
      } else {
        setProjects([]);
        setProjectsError(
          result.message || gns3.loadProjectsFailed,
        );
      }
      setIsLoadingProjects(false);
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [projectsReloadKey, gns3.loadProjectsFailed]);

  async function loadTopology(projectId: string) {
    const requestId = topologyRequestRef.current + 1;
    topologyRequestRef.current = requestId;

    setIsLoadingTopology(true);
    setTopologyError(null);
    setTopology(null);

    const result = await getGns3Topology(projectId);

    if (topologyRequestRef.current !== requestId) return;

    if (result.success && result.data) {
      setTopology(result.data);
    } else {
      setTopologyError(
        result.message || gns3.loadTopologyFailed,
      );
    }
    setIsLoadingTopology(false);
  }

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    void loadTopology(projectId);
  }

  async function handleRefresh() {
    setProjectsReloadKey((key) => key + 1);
    if (selectedProjectId) {
      await loadTopology(selectedProjectId);
    }
  }

  const selectedProject =
    projects.find((project) => project.project_id === selectedProjectId) ?? null;

  const flowNodes: Gns3FlowNode[] = (topology?.nodes ?? []).map((node) => ({
    id: String(node.node_id),
    type: "gns3Node",
    position: {
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
    },
    data: {
      name: node.name || gns3.noName,
      nodeType: node.node_type || gns3.unknown,
      status: node.status || gns3.unknown,
    },
  }));

  const flowEdges: Edge[] = (topology?.links ?? []).flatMap((link) => {
    const [source, target] = link.nodes;
    if (!source || !target) return [];

    const sourcePort =
      typeof source.port_number === "number" ? `:${source.port_number}` : "";
    const targetPort =
      typeof target.port_number === "number" ? `:${target.port_number}` : "";

    return [
      {
        id: String(link.link_id),
        source: String(source.node_id),
        target: String(target.node_id),
        label:
          sourcePort && targetPort
            ? `${sourcePort} ↔ ${targetPort}`
            : sourcePort || targetPort || undefined,
        style: { stroke: "#38bdf8", strokeWidth: 2 },
        labelStyle: { fill: "var(--muted-foreground)", fontSize: 10 },
        labelBgStyle: { fill: "var(--card)", fillOpacity: 0.9 },
      },
    ];
  });

  const hasNodes = flowNodes.length > 0;

  useEffect(() => {
    if (!topology || topology.nodes.length === 0) return;

    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.15, duration: 300 });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [topology, fitView]);

  async function handleExport() {
    const container = canvasRef.current;
    if (!container || !topology || topology.nodes.length === 0) return;

    setIsExporting(true);
    try {
      await fitView({ padding: 0.15, duration: 0 });
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 50);
      });

      const computedBackground = window.getComputedStyle(container).backgroundColor;
      const backgroundColor =
        computedBackground === "rgba(0, 0, 0, 0)" ? "#0b1120" : computedBackground;

      const dataUrl = await toPng(container, {
        pixelRatio: 2,
        backgroundColor,
        filter: (node) =>
          !node.classList?.contains("react-flow__controls") &&
          !node.classList?.contains("react-flow__attribution"),
      });

      const link = document.createElement("a");
      link.download = `topologia-${slugify(
        selectedProject?.name ?? topology.project.name,
      )}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(gns3.exported);
    } catch (error) {
      console.error("Error al exportar la topología:", error);
      notifyError(gns3.exportFailed);
    } finally {
      setIsExporting(false);
    }
  }

  const isProjectsBlocked = projects.length === 0;

  if (isLoadingProjects && isProjectsBlocked) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card/40 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        {gns3.loadingProjects}
      </div>
    );
  }

  if (projectsError && isProjectsBlocked) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card/40 p-6 text-center">
        <p className="text-sm text-destructive">{projectsError}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
          {gns3.retry}
        </Button>
      </div>
    );
  }

  if (!isLoadingProjects && !projectsError && isProjectsBlocked) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card/40 p-6 text-center">
        <Network className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {gns3.noProjects}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/50 p-3">
        <Select
          value={selectedProjectId ?? undefined}
          onValueChange={handleProjectChange}
          disabled={isLoadingProjects}
        >
          <SelectTrigger className="w-full sm:w-[300px]" aria-label={gns3.projectLabel}>
            <SelectValue placeholder={gns3.selectProject} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.project_id} value={project.project_id}>
                <span className="truncate">{project.name}</span>
                <span className="text-xs text-muted-foreground">
                  {project.status}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProject && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {selectedProject.name}
            </span>
            <Badge
              variant="outline"
              className={projectStatusClasses(selectedProject.status)}
            >
              {selectedProject.status}
            </Badge>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingProjects}
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingProjects && "animate-spin")} />
            {gns3.refresh}
          </Button>

          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting || !hasNodes}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {gns3.exportPng}
          </Button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="relative h-[calc(100dvh-220px)] min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-background"
      >
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          fitView
          minZoom={0.2}
          maxZoom={2}
          className="h-full w-full"
        >
          <Background
            color="currentColor"
            className="text-muted-foreground/20"
            gap={16}
            size={1}
          />
          <Controls
            className="!border-border !bg-card !text-foreground"
            showInteractive={false}
          />
        </ReactFlow>

        {isLoadingTopology && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70 text-sm text-muted-foreground backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            {gns3.loadingTopology}
          </div>
        )}

        {!isLoadingTopology && topologyError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 p-6 text-center backdrop-blur-sm">
            <p className="text-sm text-destructive">{topologyError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedProjectId && void loadTopology(selectedProjectId)}
            >
              <RefreshCw className="h-4 w-4" />
              {gns3.retry}
            </Button>
          </div>
        )}

        {!isLoadingTopology && !topologyError && !topology && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/60 p-6 text-center backdrop-blur-sm">
            <Network className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {gns3.selectProjectHint}
            </p>
          </div>
        )}

        {!isLoadingTopology && !topologyError && topology && !hasNodes && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/60 p-6 text-center backdrop-blur-sm">
            <Network className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {gns3.noNodes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Gns3TopologyViewer() {
  return (
    <ReactFlowProvider>
      <Gns3TopologyViewerInner />
    </ReactFlowProvider>
  );
}

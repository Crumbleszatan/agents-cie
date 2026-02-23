"use client";

import { useCallback, useMemo } from "react";
import { useStore } from "@/store/useStore";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Server,
  Globe,
  Database,
  Cloud,
  MonitorSmartphone,
  Workflow,
  AlertTriangle,
} from "lucide-react";

const iconMap = {
  service: Server,
  api: Cloud,
  database: Database,
  frontend: MonitorSmartphone,
  external: Globe,
  queue: Workflow,
};

function ArchitectureNode({ data }: NodeProps) {
  const Icon = iconMap[data.type as keyof typeof iconMap] || Server;
  const isImpacted = data.impacted as boolean;

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 bg-white min-w-[140px] transition-all ${
        isImpacted
          ? "border-orange-400 shadow-[0_0_0_3px_rgba(251,146,60,0.15)]"
          : "border-border hover:border-foreground/20"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-foreground !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-foreground !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-foreground !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-foreground !border-2 !border-white"
      />

      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isImpacted ? "bg-orange-50" : "bg-muted"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${
              isImpacted ? "text-orange-600" : "text-muted-foreground"
            }`}
          />
        </div>
        <div>
          <div className="text-xs font-semibold flex items-center gap-1.5">
            {data.label as string}
            {isImpacted && (
              <AlertTriangle className="w-3 h-3 text-orange-500" />
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {data.description as string}
          </div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  architecture: ArchitectureNode,
};

const defaultNodes: Node[] = [
  {
    id: "frontend",
    type: "architecture",
    position: { x: 400, y: 50 },
    data: {
      label: "Frontend App",
      description: "Next.js / React",
      type: "frontend",
      impacted: false,
    },
  },
  {
    id: "api-gateway",
    type: "architecture",
    position: { x: 400, y: 200 },
    data: {
      label: "API Gateway",
      description: "REST / GraphQL",
      type: "api",
      impacted: false,
    },
  },
  {
    id: "auth-service",
    type: "architecture",
    position: { x: 150, y: 350 },
    data: {
      label: "Auth Service",
      description: "JWT / OAuth",
      type: "service",
      impacted: false,
    },
  },
  {
    id: "core-service",
    type: "architecture",
    position: { x: 400, y: 350 },
    data: {
      label: "Core Service",
      description: "Business Logic",
      type: "service",
      impacted: false,
    },
  },
  {
    id: "notification-service",
    type: "architecture",
    position: { x: 650, y: 350 },
    data: {
      label: "Notifications",
      description: "Email / Push",
      type: "service",
      impacted: false,
    },
  },
  {
    id: "database",
    type: "architecture",
    position: { x: 300, y: 500 },
    data: {
      label: "PostgreSQL",
      description: "Main Database",
      type: "database",
      impacted: false,
    },
  },
  {
    id: "cache",
    type: "architecture",
    position: { x: 550, y: 500 },
    data: {
      label: "Redis",
      description: "Cache Layer",
      type: "database",
      impacted: false,
    },
  },
  {
    id: "external-api",
    type: "architecture",
    position: { x: 700, y: 200 },
    data: {
      label: "External APIs",
      description: "Third-party",
      type: "external",
      impacted: false,
    },
  },
];

const defaultEdges: Edge[] = [
  {
    id: "e1",
    source: "frontend",
    target: "api-gateway",
    animated: false,
    style: { stroke: "#e5e5e5", strokeWidth: 1.5 },
  },
  {
    id: "e2",
    source: "api-gateway",
    target: "auth-service",
    animated: false,
    style: { stroke: "#e5e5e5", strokeWidth: 1.5 },
  },
  {
    id: "e3",
    source: "api-gateway",
    target: "core-service",
    animated: false,
    style: { stroke: "#e5e5e5", strokeWidth: 1.5 },
  },
  {
    id: "e4",
    source: "api-gateway",
    target: "notification-service",
    animated: false,
    style: { stroke: "#e5e5e5", strokeWidth: 1.5 },
  },
  {
    id: "e5",
    source: "core-service",
    target: "database",
    animated: false,
    style: { stroke: "#e5e5e5", strokeWidth: 1.5 },
  },
  {
    id: "e6",
    source: "core-service",
    target: "cache",
    animated: false,
    style: { stroke: "#e5e5e5", strokeWidth: 1.5 },
  },
  {
    id: "e7",
    source: "api-gateway",
    sourceHandle: "right",
    target: "external-api",
    targetHandle: "left",
    animated: false,
    style: { stroke: "#e5e5e5", strokeWidth: 1.5 },
  },
];

export function ArchitectureView() {
  const project = useStore((s) => s.project);
  const currentStory = useStore((s) => s.currentStory);

  const initialNodes: Node[] = useMemo(() => {
    if (project?.architecture?.nodes?.length) {
      return project.architecture.nodes.map((n): Node => ({
        id: n.id,
        type: "architecture",
        position: n.position,
        data: {
          label: n.label,
          description: n.description,
          type: n.type,
          impacted: n.impacted || currentStory.affectedServices.includes(n.id),
        },
      }));
    }
    return defaultNodes.map((n): Node => ({
      id: n.id,
      type: "architecture",
      position: n.position,
      data: {
        ...n.data,
        impacted: currentStory.affectedServices.includes(n.id),
      },
    }));
  }, [project?.architecture, currentStory.affectedServices]);

  const initialEdges = useMemo(() => {
    if (project?.architecture?.edges?.length) {
      return project.architecture.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.impacted,
        label: e.label,
        style: {
          stroke: e.impacted ? "#f97316" : "#e5e5e5",
          strokeWidth: e.impacted ? 2 : 1.5,
        },
      }));
    }
    return defaultEdges;
  }, [project?.architecture]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, style: { stroke: "#e5e5e5", strokeWidth: 1.5 } },
          eds
        )
      ),
    [setEdges]
  );

  const impactedCount = nodes.filter((n) => n.data.impacted).length;

  return (
    <div className="h-full relative">
      {/* Impact Legend */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-border-light">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          <span className="text-[11px] font-medium">
            Impact ({impactedCount} services)
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-border-light">
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="text-[11px] text-muted-foreground">Non affecté</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#f0f0f0" />
        <Controls
          showInteractive={false}
          className="!bg-white !border-border-light !rounded-xl !shadow-sm"
        />
        <MiniMap
          nodeColor={(node) =>
            node.data.impacted ? "#f97316" : "#e5e5e5"
          }
          className="!bg-white !border-border-light !rounded-xl"
          maskColor="rgba(255,255,255,0.8)"
        />
      </ReactFlow>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

type WorkflowNode = {
  id: string;
  name: string;
  position: { x: number; y: number };
};

type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

type Workflow = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

type FlowNode = Node<{ label: string }>;
type FlowEdge = Edge;

function mapWorkflowToNodes(nodes: WorkflowNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: { label: node.name },
    type: "default",
  }));
}

function mapNodesToWorkflow(nodes: FlowNode[]): WorkflowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    name: typeof node.data?.label === "string" ? node.data.label : "",
    position: node.position,
  }));
}

function mapWorkflowToEdges(edges: WorkflowEdge[]): FlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "default",
  }));
}

function mapEdgesToWorkflow(edges: FlowEdge[]): WorkflowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
}

export default function Page() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWorkflow = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/workflow");
        if (!response.ok) {
          throw new Error("Failed to load workflow");
        }

        const workflow = (await response.json()) as Workflow;
        if (!isMounted) {
          return;
        }

        setNodes(mapWorkflowToNodes(workflow.nodes));
        setEdges(mapWorkflowToEdges(workflow.edges));
        setSelectedNodeId(workflow.nodes[0]?.id ?? null);
        setError(null);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load workflow");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWorkflow();

    return () => {
      isMounted = false;
    };
  }, [setEdges, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onNodeSelectionChange = useCallback((selectedNodes: FlowNode[]) => {
    setSelectedNodeId(selectedNodes[0]?.id ?? null);
  }, []);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
      onNodeSelectionChange(selectedNodes);
    },
    [onNodeSelectionChange],
  );

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const handleNameChange = useCallback(
    (name: string) => {
      if (!selectedNodeId) {
        return;
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === selectedNodeId
            ? { ...node, data: { ...node.data, label: name } }
            : node,
        ),
      );
    },
    [selectedNodeId, setNodes],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const workflow: Workflow = {
        nodes: mapNodesToWorkflow(nodes),
        edges: mapEdgesToWorkflow(edges),
      };

      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        throw new Error("Failed to save workflow");
      }

      setSaveMessage("Workflow saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }, [edges, nodes]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-2xl font-semibold">DAG Workflow Editor</h1>
        <p className="text-sm text-slate-400">
          Load, edit, and save your workflow defined in <code>src/data/workflow.json</code>.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:flex-row">
        <section className="flex-1 min-h-[360px] overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-300">
              Loading workflow...
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={handleSelectionChange}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-slate-950"
            >
              <Background color="#64748b" gap={24} />
              <MiniMap pannable zoomable />
              <Controls />
            </ReactFlow>
          )}
        </section>

        <aside className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Node Details</h2>
          {selectedNode ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300" htmlFor="node-name">
                Node name
              </label>
              <input
                id="node-name"
                type="text"
                value={typeof selectedNode.data?.label === "string" ? selectedNode.data.label : ""}
                onChange={(event) => handleNameChange(event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
              />
              <p className="text-xs text-slate-400">Select a node to edit its name.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a node in the graph to edit its name.</p>
          )}

          <div className="mt-auto space-y-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-400/60"
            >
              {saving ? "Saving..." : "Save workflow"}
            </button>
            {saveMessage ? <p className="text-xs text-emerald-400">{saveMessage}</p> : null}
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

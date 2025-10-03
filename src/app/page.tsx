"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

type WorkflowNode = {
  id: string;
  file: string;
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

type FlowNodeData = {
  file: string;
  label: string;
  onFileChange?: (id: string, value: string) => void;
};

type FlowNode = Node<FlowNodeData>;
type FlowEdge = Edge;

function mapWorkflowToNodes(nodes: WorkflowNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: {
      file: node.file,
      label: node.file,
    },
    type: "editable",
  }));
}

function mapNodesToWorkflow(nodes: FlowNode[]): WorkflowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    file: typeof node.data?.file === "string" ? node.data.file : "",
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

function EditableNode({ id, data }: NodeProps<FlowNodeData>) {
  return (
    <div className="flex min-w-[220px] flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-lg">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-slate-400">Python file</span>
        <input
          id={`file-${id}`}
          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
          value={data.file}
          onChange={(event) => data.onFileChange?.(id, event.target.value)}
        />
      </div>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-indigo-400" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-indigo-400" />
    </div>
  );
}

export default function Page() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
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

  const handleFileChange = useCallback(
    (id: string, value: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  file: value,
                  label: value || node.data?.label || node.data?.file || "",
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const nodeTypes = useMemo(
    () => ({
      editable: EditableNode,
    }),
    [],
  );

  const nodesWithHandlers = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: { ...node.data, onFileChange: handleFileChange },
      })),
    [nodes, handleFileChange],
  );

  const handleAddNode = useCallback(() => {
    setNodes((currentNodes) => {
      const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const previousNode = currentNodes[currentNodes.length - 1];

      const newNode: FlowNode = {
        id: newId,
        position: {
          x: currentNodes.length * 240,
          y: 0,
        },
        data: {
          file: `node_${currentNodes.length + 1}.py`,
          label: `node_${currentNodes.length + 1}.py`,
        },
        type: "editable",
      };

      setEdges((currentEdges) => {
        if (!previousNode) {
          return currentEdges;
        }

        const newEdge: FlowEdge = {
          id: `edge-${previousNode.id}-${newId}`,
          source: previousNode.id,
          target: newId,
          type: "default",
        };

        return [...currentEdges, newEdge];
      });

      return [...currentNodes, newNode];
    });
  }, [setEdges, setNodes]);

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

  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/run", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to run workflow");
      }
      const payload = (await response.json()) as { result?: unknown; error?: string };
      if (payload.error) {
        throw new Error(payload.error);
      }
      if (typeof window !== "undefined") {
        window.alert(`Workflow complete:\n${JSON.stringify(payload.result, null, 2)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run workflow";
      setError(message);
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-2xl font-semibold">DAG Workflow Editor</h1>
        <p className="text-sm text-slate-400">
          Each node maps to a Python file that runs sequentially. Update the configuration stored
          in <code>src/data/workflow.json</code>, then use the Run action to execute the orchestrated
          workflow.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAddNode}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-400"
          >
            Add Python node
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-400/60"
          >
            {saving ? "Saving..." : "Save workflow"}
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-400/60"
          >
            {running ? "Running..." : "Run"}
          </button>
          {saveMessage ? <p className="text-xs text-emerald-400">{saveMessage}</p> : null}
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        </div>

        <section className="flex-1 min-h-[360px] overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-300">
              Loading workflow...
            </div>
          ) : (
            <ReactFlow
              nodes={nodesWithHandlers}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-slate-950"
            >
              <Background color="#64748b" gap={24} />
              <Controls />
            </ReactFlow>
          )}
        </section>
      </div>
    </div>
  );
}

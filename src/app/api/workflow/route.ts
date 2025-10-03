import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const WORKFLOW_FILE_PATH = path.join(process.cwd(), "src", "data", "workflow.json");

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

function isValidWorkflow(workflow: unknown): workflow is Workflow {
  if (!workflow || typeof workflow !== "object") {
    return false;
  }

  const { nodes, edges } = workflow as Workflow;

  const nodesValid =
    Array.isArray(nodes) &&
    nodes.every(
      (node) =>
        node &&
        typeof node === "object" &&
        typeof node.id === "string" &&
        typeof node.name === "string" &&
        node.position &&
        typeof node.position === "object" &&
        typeof node.position.x === "number" &&
        typeof node.position.y === "number"
    );

  const edgesValid =
    Array.isArray(edges) &&
    edges.every(
      (edge) =>
        edge &&
        typeof edge === "object" &&
        typeof edge.id === "string" &&
        typeof edge.source === "string" &&
        typeof edge.target === "string"
    );

  return nodesValid && edgesValid;
}

export async function GET() {
  try {
    const fileContents = await fs.readFile(WORKFLOW_FILE_PATH, "utf-8");
    const workflow = JSON.parse(fileContents) as Workflow;
    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Failed to read workflow file", error);
    return NextResponse.json({ error: "Failed to read workflow" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workflow = (await request.json()) as unknown;

    if (!isValidWorkflow(workflow)) {
      return NextResponse.json({ error: "Invalid workflow format" }, { status: 400 });
    }

    await fs.writeFile(WORKFLOW_FILE_PATH, JSON.stringify(workflow, null, 2));
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Failed to save workflow file", error);
    return NextResponse.json({ error: "Failed to save workflow" }, { status: 500 });
  }
}

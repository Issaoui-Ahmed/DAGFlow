import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

const ORCHESTRATOR_PATH = path.join(process.cwd(), "src", "workflow", "orchestrator.py");

function runOrchestrator(): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile("python3", [ORCHESTRATOR_PATH], { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function POST() {
  try {
    const { stdout } = await runOrchestrator();
    const payload = JSON.parse(stdout || "{}") as { result?: unknown; error?: string };

    if (payload.error) {
      return NextResponse.json({ error: payload.error }, { status: 500 });
    }

    return NextResponse.json({ result: payload.result ?? null });
  } catch (err) {
    const message =
      err && typeof err === "object" && "stderr" in err && typeof err.stderr === "string"
        ? err.stderr || "Failed to run workflow"
        : err instanceof Error
          ? err.message
          : "Failed to run workflow";

    console.error("Workflow execution failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

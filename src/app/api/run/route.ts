import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

const ORCHESTRATOR_PATH = path.join(process.cwd(), "src", "workflow", "orchestrator.py");

type ExecError = NodeJS.ErrnoException & {
  stdout?: string;
  stderr?: string;
};

const PYTHON_EXECUTABLES = Array.from(
  new Set(
    [
      process.env.PYTHON,
      process.env.PYTHON_PATH,
      "python3",
      "python",
      process.platform === "win32" ? "py" : undefined,
    ].filter((value): value is string => typeof value === "string" && value.length > 0)
  )
);

function execOrchestrator(pythonExecutable: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(pythonExecutable, [ORCHESTRATOR_PATH], { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function runOrchestrator(): Promise<{ stdout: string; stderr: string }> {
  let lastError: ExecError | null = null;

  for (const executable of PYTHON_EXECUTABLES) {
    try {
      return await execOrchestrator(executable);
    } catch (error) {
      if (isExecError(error) && error.code === "ENOENT") {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    "Unable to locate a Python executable. Install Python or set the PYTHON environment variable."
  );
}

function isExecError(error: unknown): error is ExecError {
  return Boolean(error) && typeof error === "object" && "code" in error;
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
    const message = (() => {
      if (isExecError(err) && err.code === "ENOENT") {
        return "Python executable not found. Install Python and ensure it is on your PATH.";
      }

      if (err && typeof err === "object" && "stderr" in err && typeof err.stderr === "string") {
        return err.stderr || "Failed to run workflow";
      }

      if (err instanceof Error) {
        return err.message;
      }

      return "Failed to run workflow";
    })();

    console.error("Workflow execution failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

"""Run the configured workflow sequentially."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from types import ModuleType
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent
WORKFLOW_FILE = BASE_DIR.parent / "data" / "workflow.json"
NODES_DIR = BASE_DIR / "nodes"


class WorkflowError(RuntimeError):
    """Raised when the workflow configuration or execution fails."""


def _load_module_from_path(module_path: Path) -> ModuleType:
    if not module_path.exists():
        raise WorkflowError(f"Node file not found: {module_path}")

    spec = importlib.util.spec_from_file_location(module_path.stem, module_path)
    if spec is None or spec.loader is None:
        raise WorkflowError(f"Unable to load module from {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[misc]
    return module


def run_workflow() -> Dict[str, Any]:
    try:
        workflow_data = json.loads(WORKFLOW_FILE.read_text())
    except FileNotFoundError as exc:
        raise WorkflowError(f"Workflow file not found: {WORKFLOW_FILE}") from exc
    except json.JSONDecodeError as exc:
        raise WorkflowError("Workflow file is not valid JSON") from exc

    nodes: List[Dict[str, Any]] = workflow_data.get("nodes", [])
    if not isinstance(nodes, list) or not nodes:
        raise WorkflowError("Workflow must contain at least one node")

    result: Any = None
    for node in nodes:
        if not isinstance(node, dict):
            raise WorkflowError("Invalid node definition encountered")

        file_name = node.get("file")
        if not isinstance(file_name, str) or not file_name:
            raise WorkflowError("Node is missing a valid 'file' entry")

        module_path = NODES_DIR / file_name
        module = _load_module_from_path(module_path)
        run_callable = getattr(module, "run", None)
        if not callable(run_callable):
            raise WorkflowError(f"Node '{file_name}' does not define a callable 'run' function")

        result = run_callable(result)

    return {"result": result}


def main() -> None:
    try:
        payload = run_workflow()
    except WorkflowError as exc:
        output = {"error": str(exc)}
    else:
        output = payload

    print(json.dumps(output))


if __name__ == "__main__":
    main()

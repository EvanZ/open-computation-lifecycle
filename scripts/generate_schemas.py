"""Generate committed JSON Schemas from the reference Pydantic models."""

from __future__ import annotations

import json
from pathlib import Path

from oclp.models import (
    OCLP_RECORD_ADAPTER,
    Artifact,
    ComputationDefinition,
    Evidence,
    Invocation,
    LifecycleEvent,
)

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT / "schemas"
MODELS = {
    "artifact": Artifact,
    "definition": ComputationDefinition,
    "invocation": Invocation,
    "evidence": Evidence,
    "event": LifecycleEvent,
}


def write_schema(name: str, schema: dict[str, object]) -> None:
    path = SCHEMA_DIR / f"{name}.schema.json"
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        **schema,
    }
    path.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")


def main() -> None:
    SCHEMA_DIR.mkdir(exist_ok=True)
    for name, model in MODELS.items():
        write_schema(name, model.model_json_schema())
    write_schema("oclp-record", OCLP_RECORD_ADAPTER.json_schema())


if __name__ == "__main__":
    main()

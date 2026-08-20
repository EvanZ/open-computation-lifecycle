"""Generate committed JSON Schemas from the reference Pydantic models."""

from __future__ import annotations

import json
from pathlib import Path

from oclp.models import (
    OCLP_RECORD_ADAPTER,
    Artifact,
    ArtifactSet,
    ComputationDefinition,
    Evidence,
    Invocation,
    LifecycleEvent,
)
from oclp.profiles import DatasetSnapshotManifest

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT / "schemas"
PROFILE_DIR = ROOT / "profiles"
MODELS = {
    "artifact": Artifact,
    "artifact-set": ArtifactSet,
    "definition": ComputationDefinition,
    "invocation": Invocation,
    "evidence": Evidence,
    "event": LifecycleEvent,
}


def write_schema(path: Path, schema: dict[str, object]) -> None:
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        **schema,
    }
    path.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")


def main() -> None:
    SCHEMA_DIR.mkdir(exist_ok=True)
    for name, model in MODELS.items():
        write_schema(SCHEMA_DIR / f"{name}.schema.json", model.model_json_schema())
    write_schema(
        SCHEMA_DIR / "oclp-record.schema.json",
        OCLP_RECORD_ADAPTER.json_schema(),
    )
    PROFILE_DIR.mkdir(exist_ok=True)
    write_schema(
        PROFILE_DIR / "dataset-snapshot.schema.json",
        DatasetSnapshotManifest.model_json_schema(),
    )


if __name__ == "__main__":
    main()

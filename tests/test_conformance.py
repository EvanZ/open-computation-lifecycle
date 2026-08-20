"""Language-neutral OCLP conformance vectors exercised by the Python SDK."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from oclp import canonical_json_bytes, parse_record, record_digest

CONFORMANCE = Path(__file__).parent / "conformance"
ROOT = Path(__file__).resolve().parents[1]


def _manifest() -> dict[str, object]:
    return json.loads((CONFORMANCE / "manifest.json").read_text())


def test_valid_conformance_vectors_have_expected_canonical_bytes_and_digests() -> None:
    manifest = _manifest()
    for entry in manifest["valid"]:
        assert isinstance(entry, dict)
        record = parse_record(json.loads((CONFORMANCE / entry["path"]).read_text()))
        assert canonical_json_bytes(record).decode() == entry["canonical_json"]
        assert str(record_digest(record)) == entry["digest"]


def test_invalid_conformance_vectors_are_rejected() -> None:
    manifest = _manifest()
    for fixture_path in manifest["invalid"]:
        with pytest.raises(ValidationError):
            parse_record(json.loads((CONFORMANCE / fixture_path).read_text()))


def test_conformance_lineage_vector_has_explicit_bindings() -> None:
    manifest = _manifest()
    records = {
        record.id: record.model_dump(mode="json")
        for entry in manifest["valid"]
        for record in [
            parse_record(json.loads((CONFORMANCE / entry["path"]).read_text()))
        ]
    }
    lineage = manifest["lineage"]
    invocation = records[lineage["invocation_id"]]
    assert invocation["definition"]["id"] == lineage["definition_id"]
    assert invocation["inputs"]["source"][0]["id"] == lineage["input_artifact_id"]
    assert records[lineage["evidence_id"]]["subject"]["id"] == lineage["invocation_id"]
    assert records[lineage["event_id"]]["invocation"]["id"] == lineage["invocation_id"]


def test_site_specification_mirrors_the_canonical_specification() -> None:
    assert (ROOT / "docs/protocol/specification.md").read_text() == (
        ROOT / "spec/oclp-core.md"
    ).read_text()


def test_site_dataset_snapshot_specification_mirrors_the_canonical_specification() -> None:
    assert (ROOT / "docs/profiles/dataset-snapshot.md").read_text() == (
        ROOT / "spec/dataset-snapshot.md"
    ).read_text()

"""Conformance tests for the portable dataset-snapshot profile."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from oclp import canonical_json_bytes, record_digest
from oclp.profiles import DatasetSnapshotManifest

PROFILE_ROOT = Path(__file__).parent / "profiles" / "dataset-snapshot"


def _manifest() -> dict[str, object]:
    return json.loads((PROFILE_ROOT / "manifest.json").read_text())


def test_dataset_snapshot_valid_vectors_have_canonical_digests() -> None:
    for entry in _manifest()["valid"]:
        assert isinstance(entry, dict)
        snapshot = DatasetSnapshotManifest.model_validate(
            json.loads((PROFILE_ROOT / entry["path"]).read_text())
        )
        assert canonical_json_bytes(snapshot).decode() == entry["canonical_json"]
        assert str(record_digest(snapshot)) == entry["digest"]


def test_dataset_snapshot_invalid_vectors_are_rejected() -> None:
    for fixture_path in _manifest()["invalid"]:
        with pytest.raises(ValidationError):
            DatasetSnapshotManifest.model_validate(
                json.loads((PROFILE_ROOT / fixture_path).read_text())
            )

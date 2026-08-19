from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from oclp import Artifact, canonical_json_bytes, parse_record, record_digest
from oclp.models import Digest

FIXTURES = Path(__file__).parent / "fixtures"


def test_canonical_serialization_is_stable() -> None:
    artifact = Artifact(
        id="artifact.example",
        media_type="application/octet-stream",
        digest=Digest(value="a" * 64),
        size=12,
    )

    assert canonical_json_bytes(artifact) == canonical_json_bytes(artifact)
    assert str(record_digest(artifact)).startswith("sha256:")


def test_valid_conformance_fixtures_are_accepted() -> None:
    for path in (FIXTURES / "valid").glob("*.json"):
        parse_record(json.loads(path.read_text()))


def test_invalid_conformance_fixtures_are_rejected() -> None:
    for path in (FIXTURES / "invalid").glob("*.json"):
        with pytest.raises(ValidationError):
            parse_record(json.loads(path.read_text()))

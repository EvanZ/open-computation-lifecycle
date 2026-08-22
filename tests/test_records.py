from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from oclp import Artifact, Invocation, canonical_json_bytes, parse_record, record_digest
from oclp.models import Digest, RecordReference

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


def test_legacy_invocation_omits_absent_outputs_from_canonical_json() -> None:
    invocation = Invocation(
        id="invocation.example",
        definition=RecordReference(id="definition.example"),
    )

    assert b'"outputs"' not in canonical_json_bytes(invocation)


def test_valid_conformance_fixtures_are_accepted() -> None:
    for path in (FIXTURES / "valid").glob("*.json"):
        parse_record(json.loads(path.read_text()))


def test_invalid_conformance_fixtures_are_rejected() -> None:
    for path in (FIXTURES / "invalid").glob("*.json"):
        with pytest.raises(ValidationError):
            parse_record(json.loads(path.read_text()))


def test_generic_examples_are_accepted() -> None:
    for path in (Path(__file__).parents[1] / "examples").glob("*.json"):
        parse_record(json.loads(path.read_text()))

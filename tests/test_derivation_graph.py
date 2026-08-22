"""Tests for the resolved OCLP derivation-DAG contract."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from oclp import (
    Artifact,
    ComputationDefinition,
    DerivationValidationError,
    Invocation,
    record_digest,
    validate_derivation_graph,
)
from oclp.models import Digest, Implementation, RecordReference


def test_resolved_input_and_output_bindings_form_a_valid_dag() -> None:
    source = _artifact("source", "a")
    result = _artifact("result", "b")
    definition = ComputationDefinition(
        id="urn:example:definition:transform",
        implementation=Implementation(kind="other", locator="example:transform"),
    )
    invocation = Invocation(
        id="urn:example:invocation:transform",
        definition=_reference(definition),
        inputs={"source": (_reference(source),)},
        outputs={"result": (_reference(result),)},
    )

    validate_derivation_graph((source, definition, invocation, result))


def test_invocation_outputs_must_be_content_bound() -> None:
    with pytest.raises(ValidationError, match="outputs must include record digests"):
        Invocation(
            id="urn:example:invocation:transform",
            definition=RecordReference(id="urn:example:definition:transform"),
            outputs={"result": (RecordReference(id="urn:example:artifact:result"),)},
        )


def test_derivation_validator_rejects_unresolved_inputs() -> None:
    definition = ComputationDefinition(
        id="urn:example:definition:transform",
        implementation=Implementation(kind="other", locator="example:transform"),
    )
    invocation = Invocation(
        id="urn:example:invocation:transform",
        definition=_reference(definition),
        inputs={
            "source": (
                RecordReference(
                    id="urn:example:artifact:missing",
                    digest=Digest(value="c" * 64),
                ),
            )
        },
    )

    with pytest.raises(DerivationValidationError, match="does not resolve"):
        validate_derivation_graph((definition, invocation))


def test_derivation_validator_rejects_a_cycle() -> None:
    source = _artifact("source", "a")
    definition = ComputationDefinition(
        id="urn:example:definition:identity",
        implementation=Implementation(kind="other", locator="example:identity"),
    )
    invocation = Invocation(
        id="urn:example:invocation:identity",
        definition=_reference(definition),
        inputs={"value": (_reference(source),)},
        outputs={"value": (_reference(source),)},
    )

    with pytest.raises(DerivationValidationError, match="contains a cycle"):
        validate_derivation_graph((source, definition, invocation))


def _artifact(name: str, digest_character: str) -> Artifact:
    return Artifact(
        id=f"urn:example:artifact:{name}",
        media_type="application/octet-stream",
        digest=Digest(value=digest_character * 64),
        size=1,
    )


def _reference(record: object) -> RecordReference:
    return RecordReference(id=record.id, digest=record_digest(record))

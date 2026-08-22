"""Parsing and validation helpers for OCLP records."""

from __future__ import annotations

import json
from collections import defaultdict
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from oclp.canonical import record_digest
from oclp.models import OCLP_RECORD_ADAPTER, OclpRecord, RecordReference


class DerivationValidationError(ValueError):
    """A resolved OCLP derivation graph is incomplete or cyclic."""


def parse_record(value: Any) -> OclpRecord:
    return OCLP_RECORD_ADAPTER.validate_python(value)


def load_record(path: str | Path) -> OclpRecord:
    with Path(path).open(encoding="utf-8") as handle:
        return parse_record(json.load(handle))


def validate_derivation_graph(records: Iterable[OclpRecord]) -> None:
    """Validate the resolved Artifact -> Invocation -> Artifact DAG.

    Record-level parsing permits unbound input references because an individual
    record cannot resolve them. A collection offered as a derivation graph must
    bind and resolve every Definition, input Artifact, and output Artifact
    reference used by an Invocation.
    """

    by_digest = {record_digest(record).value: record for record in records}
    adjacency: dict[str, set[str]] = defaultdict(set)

    for invocation_digest, record in by_digest.items():
        if record.kind != "invocation":
            continue
        _require_reference(
            record.definition,
            by_digest,
            expected_kind="definition",
            label=f"Invocation {record.id} definition",
        )
        for port, references in record.inputs.items():
            for reference in references:
                input_digest = _require_reference(
                    reference,
                    by_digest,
                    expected_kind="artifact",
                    label=f"Invocation {record.id} input {port!r}",
                )
                adjacency[input_digest].add(invocation_digest)
        for port, references in (record.outputs or {}).items():
            for reference in references:
                output_digest = _require_reference(
                    reference,
                    by_digest,
                    expected_kind="artifact",
                    label=f"Invocation {record.id} output {port!r}",
                )
                adjacency[invocation_digest].add(output_digest)

    _raise_on_cycle(adjacency)


def _require_reference(
    reference: RecordReference,
    records: dict[str, OclpRecord],
    *,
    expected_kind: str,
    label: str,
) -> str:
    if reference.digest is None:
        raise DerivationValidationError(f"{label} must include a record digest")
    digest = reference.digest.value
    target = records.get(digest)
    if target is None:
        raise DerivationValidationError(f"{label} does not resolve in this record set")
    if target.kind != expected_kind:
        raise DerivationValidationError(
            f"{label} must resolve to a {expected_kind}, got {target.kind}"
        )
    if target.id != reference.id:
        raise DerivationValidationError(
            f"{label} ID does not match its resolved record"
        )
    return digest


def _raise_on_cycle(adjacency: dict[str, set[str]]) -> None:
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        if node in visiting:
            raise DerivationValidationError("derivation graph contains a cycle")
        if node in visited:
            return
        visiting.add(node)
        for neighbor in adjacency.get(node, ()):
            visit(neighbor)
        visiting.remove(node)
        visited.add(node)

    for node in tuple(adjacency):
        visit(node)

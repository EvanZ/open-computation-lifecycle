"""Reference SDK for the Open Computation Lifecycle Protocol."""

from oclp.canonical import canonical_json_bytes, record_digest
from oclp.models import (
    Artifact,
    ComputationDefinition,
    Evidence,
    Invocation,
    LifecycleEvent,
)
from oclp.validation import parse_record

__all__ = [
    "Artifact",
    "ComputationDefinition",
    "Evidence",
    "Invocation",
    "LifecycleEvent",
    "canonical_json_bytes",
    "parse_record",
    "record_digest",
]

__version__ = "0.1.0a0"


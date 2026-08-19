"""RFC 8785 canonical JSON serialization and record digests."""

from __future__ import annotations

import hashlib

import rfc8785

from oclp.models import CoreRecord, Digest


def canonical_json_bytes(record: CoreRecord) -> bytes:
    """Serialize a record using the JSON Canonicalization Scheme."""
    payload = record.model_dump(mode="json", exclude_none=True)
    return rfc8785.dumps(payload)


def record_digest(record: CoreRecord) -> Digest:
    return Digest(value=hashlib.sha256(canonical_json_bytes(record)).hexdigest())


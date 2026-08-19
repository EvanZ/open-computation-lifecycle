"""Parsing and validation helpers for OCLP records."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from oclp.models import OCLP_RECORD_ADAPTER, OclpRecord


def parse_record(value: Any) -> OclpRecord:
    return OCLP_RECORD_ADAPTER.validate_python(value)


def load_record(path: str | Path) -> OclpRecord:
    with Path(path).open(encoding="utf-8") as handle:
        return parse_record(json.load(handle))


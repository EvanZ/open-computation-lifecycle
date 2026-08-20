# Reference SDK

The Python distribution and import package are both named `oclp`.

```bash
uv add oclp
```

The SDK exposes typed Pydantic models, record validation, RFC 8785 canonical
serialization, and SHA-256 record digests:

```python
from oclp import Artifact, canonical_json_bytes, parse_record, record_digest
```

For development in this repository:

```bash
uv sync --group dev
uv run pytest
uv run --group docs zensical serve
```

The `oclp validate path/to/record.json` command validates a serialized record
and prints its digest.

An `Implementation` can optionally reference an ordinary, content-bound
`Artifact` for its source bundle, wheel, or container manifest. OCLP does not
define a separate code-artifact type.

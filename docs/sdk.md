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

For Git-backed code, an `Implementation` can record its repository, immutable
commit, and source path directly in `source`. It can independently reference
an ordinary, content-bound `Artifact` for a wheel, container manifest, or an
intentional source archive. OCLP does not infer an import closure or define a
separate code-artifact type. When an Artifact already supplies the
implementation's content digest, producers omit `Implementation.digest`; that
optional field is reserved for a distinct runtime fingerprint.

## Optional DuckDB catalog

Install the optional DuckDB dependency when a local resolver and lineage index
is useful:

```bash
uv add 'oclp[duckdb]'
```

`DuckdbCatalog` stores canonical OCLP records by record digest, resolves exact
`RecordReference` values, and indexes mutable location hints by Artifact
content digest. It is a reference implementation of the Core record-resolution
contract, not a storage requirement or blob server.

# OCLP draft-0.1 conformance vectors

This directory is the language-neutral executable contract for the OCLP draft.
It is intentionally made of JSON fixtures and expected strings rather than
Python objects.

## Contents

- `manifest.json` lists valid records, their RFC 8785 canonical JSON, expected
  SHA-256 record digests, invalid records, and a complete lineage fixture.
- `valid/` contains one record for each core kind.
- `invalid/` contains records that must be rejected. Some constraints, such as
  unique Definition port names, are semantic rules in addition to JSON Schema.

The expected digest is the SHA-256 hash of the UTF-8 canonical JSON string,
prefixed with `sha256:`. The trailing newline used by a file transport is not
part of a record's canonical bytes.

## Implementer contract

An implementation conforms to this fixture corpus when it:

1. accepts every `valid` record according to the schema and applicable semantic
   rules;
2. rejects every `invalid` record;
3. produces the exact `canonical_json` string and `digest` for every valid
   record; and
4. preserves the references described by `lineage`.

The Python SDK exercises these fixtures in `tests/test_conformance.py`. The
independent TypeScript verifier lives in `conformance/typescript/`:

```bash
cd conformance/typescript
npm ci
npm run typecheck
npm run verify
```

Add a fixture only when the draft specification defines its expected behavior.
Update the specification, schemas, vectors, and every verifier together when a
protocol change is intentional.

Optional profiles keep their independent vectors under `tests/profiles/`. The
TypeScript verifier exercises the dataset-snapshot profile alongside Core.

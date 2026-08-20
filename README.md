# Open Computation Lifecycle Protocol

OCLP is a vendor-neutral protocol for describing, executing, verifying, and
tracing durable computations.

> [!WARNING]
> OCLP is an experimental pre-1.0 draft. Its records and semantics will change.

This repository contains the evolving protocol specification, JSON Schemas,
conformance fixtures, and Python reference SDK. Bach is the internal codename
for this incubation effort.

## Scope

OCLP standardizes the durable boundary between producers and consumers of
computation metadata:

- computation definitions and exact invocations;
- immutable artifacts and their content identities;
- execution events and attempts;
- contracts and verification evidence;
- lineage formed by explicit input and output bindings.

OCLP does not prescribe a scheduler, storage backend, programming language, or
data-processing framework.

## Development

```bash
uv sync --group dev
uv run pytest
uv run python scripts/generate_schemas.py
uv run oclp validate examples/document-transformation-artifact.json
```

Run the independent TypeScript conformance verifier with:

```bash
cd conformance/typescript
npm ci
npm run typecheck
npm run verify
```

The current draft is in [`spec/oclp-core.md`](spec/oclp-core.md).

The language-neutral [conformance vectors](tests/conformance/README.md) define
the executable interoperability contract for the draft.

The [generic examples](examples/README.md) show individual records for document
transformation, model inference, software builds, and data-quality checks.

The optional [dataset-snapshot profile](spec/dataset-snapshot.md)
defines a canonical manifest for large immutable logical dataset versions.

## Documentation

The Zensical site provides a reader-oriented introduction to the protocol and
reference SDK:

<https://evanz.github.io/open-computation-lifecycle/>

```bash
uv sync --group docs
uv run --group docs zensical serve
```

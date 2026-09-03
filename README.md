# Open Computation Lifecycle Protocol

OCLP is a vendor-neutral protocol for describing, executing, verifying, and
tracing durable computations.

> [!WARNING]
> OCLP is an experimental pre-1.0 draft. Its records and semantics will change.

This repository contains the evolving protocol specification, JSON Schemas,
conformance fixtures, and independent TypeScript verifier. Bach is the
internal codename for this incubation effort.

The Python reference SDK lives in the separate
[`oclp-python`](https://github.com/EvanZ/oclp-python) repository. SDKs
implement this repository's contract; they do not define it.

## Scope

OCLP standardizes the durable boundary between producers and consumers of
computation metadata:

- reusable Computations and exact Executions;
- immutable artifacts and their content identities;
- execution lifecycle Events;
- source-bound Contracts, verification Evidence, and optional Computation-level success requirements;
- lineage formed by explicit input and output bindings.

OCLP does not prescribe a scheduler, storage backend, programming language, or
data-processing framework.

## Development

```bash
cd conformance/typescript
npm ci
npm run typecheck
npm run verify
```

The committed JSON Schemas and fixtures are maintained as standard artifacts,
not generated from any SDK. Run an SDK against this checkout's conformance
corpus with its own test command, for example:

```bash
cd ../oclp-python
OCLP_STANDARD_ROOT=../open-computation-lifecycle \
  uv run pytest tests/test_standard_conformance.py
```

The current draft is in [`spec/oclp-core.md`](spec/oclp-core.md).

The language-neutral [conformance vectors](tests/conformance/README.md) define
the executable interoperability contract for the draft.

The [generic examples](examples/README.md) show individual records for document
transformation, model inference, software builds, and data-quality checks.

Optional profile contracts are published separately in
[`oclp-profiles`](https://github.com/EvanZ/oclp-profiles). OCLP Core defines
how records claim and compose profiles; it does not own their domain schemas.

## Documentation

The Zensical site provides a reader-oriented introduction to the protocol:

<https://evanz.github.io/open-computation-lifecycle/>

```bash
uv sync --group docs
uv run --group docs zensical serve
```

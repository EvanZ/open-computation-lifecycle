# Cross-language conformance

OCLP's specification must not depend on Pydantic or Python behavior. The
language-neutral fixture corpus is the executable contract for draft 0.1.

Each valid fixture provides its JSON record, exact RFC 8785 canonical JSON, and
expected SHA-256 record digest. Invalid fixtures capture schema and semantic
rules. The lineage fixture connects the primary execution record kinds; the
ArtifactSet fixture covers immutable package membership.

## Run the verifiers

The Python SDK verifier:

```bash
uv run pytest tests/test_conformance.py
```

The independent TypeScript verifier:

```bash
cd conformance/typescript
npm ci
npm run typecheck
npm run verify
```

The TypeScript verifier uses the published JSON Schema, an RFC 8785
canonicalizer, and Node's SHA-256 implementation. It therefore checks the
same corpus without invoking the Python package.

## Extending the contract

Add only behavior that is defined by the specification. A protocol change must
update the specification, generated schemas, fixtures, expected canonical
digests, and both verifiers as one reviewable change.

See [`tests/conformance/README.md`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/tests/conformance/README.md)
for fixture details and the implementer contract.

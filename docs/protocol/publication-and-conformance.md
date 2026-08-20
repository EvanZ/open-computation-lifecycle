# Publication and conformance

Publication is append-only in effect: a producer may add records, but must not
change an accepted record or an invocation's input bindings after execution
begins.

## Required invariants

- Published artifacts are immutable.
- Attempts do not replace invocation identity.
- Required outputs and evidence are published before completion.
- Mutable labels such as `latest` are references, not artifact identities.
- Replaying an accepted event is idempotent.

## Conformance

A draft-0.1 producer validates every emitted core record against the published
JSON Schemas. A conforming consumer accepts valid fixtures and rejects invalid
ones. Runtime behavior is intentionally outside the current conformance scope.

The [cross-language conformance](conformance.md) guide describes the executable
fixture contract and its independent Python and TypeScript verifiers.

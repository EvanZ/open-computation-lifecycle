# Publication and conformance

Publication is append-only in effect: a producer may add records, but must not
change an accepted record or an Execution's input bindings after execution
begins.

## Required invariants

- Published artifacts are immutable.
- Direct durable outputs are bound on the Execution, not inferred only from Event data.
- Resolved Artifact/ArtifactSet-to-Execution derivation bindings form an acyclic graph.
- Each retry or rerun is a distinct Execution; there is no nested Attempt identity.
- A claimed successful Execution satisfies every Evidence requirement declared
  by its Computation; producers should publish that Evidence before the
  successful terminal Event.
- Mutable labels such as `latest` are references, not artifact identities.
- Replaying an accepted event is idempotent.

## Conformance

A draft-0.3 producer validates every emitted core record against the published
JSON Schemas. A conforming consumer accepts valid fixtures and rejects invalid
ones. Runtime behavior is intentionally outside the current conformance scope.

The [cross-language conformance](conformance.md) guide describes the executable
fixture contract and its independent Python and TypeScript verifiers.

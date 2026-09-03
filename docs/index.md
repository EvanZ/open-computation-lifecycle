# Open Computation Lifecycle Protocol

OCLP is a vendor-neutral protocol for describing durable computations. It lets a
producer record the selected Computation, each concrete Execution, the exact
artifacts consumed and produced, and the evidence collected along the way.
Computations can optionally declare the Evidence that must pass before an
Execution may claim success.

It is deliberately not a workflow engine, scheduler, storage service, or
domain-modeling framework. Those systems may produce and consume OCLP records.

## The core idea

Lineage comes from immutable, typed records rather than a mutable graph:

```text
Computation -> Execution -> produced Artifact
                   ^              |
                   |              v
     consumed Artifact or ArtifactSet
                                Evidence
                   |
                   v
                 Events

ArtifactSet -> named, content-bound Artifacts
```

Start with the [normative specification](protocol/specification.md), then use
the [protocol overview](protocol/overview.md) as a reader-oriented guide.

## Status

OCLP draft 0.2 is experimental. The core schema and conventions are being
tested in real consumer repositories before they are stabilized. Optional
domain profiles are independently versioned outside the Core standard.

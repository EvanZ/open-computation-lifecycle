# Open Computation Lifecycle Protocol

OCLP is a vendor-neutral protocol for describing durable computations. It lets a
producer record what was requested, the implementation selected, the exact
artifacts consumed and produced, and the evidence collected along the way.

It is deliberately not a workflow engine, scheduler, storage service, or
domain-modeling framework. Those systems may produce and consume OCLP records.

## The core idea

Lineage comes from immutable, typed records rather than a mutable graph:

```text
Definition -> Invocation -> produced Artifact
                  ^              |
                  |              v
          consumed Artifact    Evidence
                  |
                  v
                Events

ArtifactSet -> named, content-bound Artifacts
```

Start with the [normative specification](protocol/specification.md), then use
the [protocol overview](protocol/overview.md) as a reader-oriented guide.

## Status

OCLP draft 0.1 is experimental. The schema, lifecycle vocabulary, and
conventions are being tested in real consumer repositories before they are
stabilized.

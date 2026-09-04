# Identity and lineage

Artifact payload identity is based on immutable content: draft 0.3 uses a SHA-256
digest, media type, and byte size. Locations are retrieval hints only; they do
not name the content.

Catalogs may hash canonical Core records using the I-JSON data model and RFC
8785 JSON Canonicalization Scheme (JCS). This gives compatible implementations
the same local integrity check without making the hash a second Core identity.
Every Core record is instead identified and referenced by one opaque UUID.

## Traversal

The default derivation view is an acyclic graph derived from immutable bindings:

```text
Artifact or ArtifactSet -> Execution input binding -> processed Artifact or ArtifactSet
code Artifact -> Computation implementation binding
ArtifactSet  -> named Artifact members
Computation  -> Execution computation binding
Evidence     -> Execution, Artifact, ArtifactSet, Computation, or Event
Event        -> Execution
```

The `Artifact or ArtifactSet -> Execution -> Artifact or ArtifactSet` path participates in
DAG validation. Computation implementation bindings, ArtifactSet membership,
Evidence, and Events are useful reference and audit overlays, but do not alter
the computation order. An Execution's `outputs` is the authoritative durable
publication binding; an Event may report that publication but does not replace
it.

Indexes may make this traversal fast, but they are not protocol truth and must
be rebuildable from the records themselves.

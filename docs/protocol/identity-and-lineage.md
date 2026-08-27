# Identity and lineage

Artifact identity is based on immutable content: draft 0.1 uses a SHA-256
digest, media type, and byte size. Locations are retrieval hints only; they do
not name the content.

Record digests use the I-JSON data model and RFC 8785 JSON Canonicalization
Scheme (JCS). This gives compatible producers the same canonical bytes and
digest for the same record.

## Traversal

The default derivation view is an acyclic graph derived from immutable bindings:

```text
Artifact or ArtifactSet -> Invocation input binding -> processed Artifact or ArtifactSet
code Artifact -> Definition implementation binding
ArtifactSet  -> named, content-bound Artifact members
Definition   -> Invocation definition binding
Evidence     -> Invocation, Artifact, ArtifactSet, Definition, or Event
Event        -> Invocation or attempt
```

The `Artifact or ArtifactSet -> Invocation -> Artifact or ArtifactSet` path participates in
DAG validation. Definition implementation bindings, ArtifactSet membership,
Evidence, and Events are useful reference and audit overlays, but do not alter
the computation order. An Invocation's `outputs` is the authoritative durable
publication binding; an Event may report that publication but does not replace
it.

Indexes may make this traversal fast, but they are not protocol truth and must
be rebuildable from the records themselves.

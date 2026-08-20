# Identity and lineage

Artifact identity is based on immutable content: draft 0.1 uses a SHA-256
digest, media type, and byte size. Locations are retrieval hints only; they do
not name the content.

Record digests use the I-JSON data model and RFC 8785 JSON Canonicalization
Scheme (JCS). This gives compatible producers the same canonical bytes and
digest for the same record.

## Traversal

Lineage is derived from immutable references:

```text
raw Artifact -> Invocation input binding -> processed Artifact
ArtifactSet  -> named, content-bound Artifact members
Definition   -> Invocation definition binding
Evidence     -> Invocation, Artifact, ArtifactSet, Definition, or Event
Event        -> Invocation or attempt
```

Indexes may make this traversal fast, but they are not protocol truth and must
be rebuildable from the records themselves.

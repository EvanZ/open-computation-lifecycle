# Roadmap

This page is non-normative. It describes directions being considered for OCLP
implementations and the surrounding ecosystem; it does not add requirements to
the Core protocol.

Roadmap items may link to a GitHub issue when active implementation work is
intended. An issue tracks delivery; closing it as implemented or declined
updates the roadmap entry rather than silently changing protocol scope.

OCLP Core defines portable records and their lineage semantics. It deliberately
does not require a database, object store, stream broker, or observability
vendor. Implementations should be able to preserve the same records while
changing where they are retained, indexed, or delivered.

## Implementation ownership

Concrete publisher, store, catalog, exporter, and framework-adapter work is
implementation-specific rather than OCLP Core work. The Python SDK tracks its
own delivery and storage directions in the
[SDK roadmap](https://evanz.github.io/oclp-python/roadmap/). Those
implementations must preserve the Core record semantics and must not make a
particular database, object store, stream broker, or observability vendor a
protocol requirement.

## Additional roadmap directions

The following directions are complementary to future stores and delivery. They
are ordered by the type of interoperability problem they address, not a promise
of release order.

### Core stability

- Continue dogfooding the draft in independent consumer repositories, then
  stabilize OCLP 0.1 from those findings.
- Publish a compatibility and deprecation policy for Core schemas.
- Expand cross-language conformance fixtures and independent verifiers beyond
  the current implementations.

### Optional persistent lifecycle association

OCLP currently treats a **run** as one materialization: producers may assign
its `profiles.run.run_id` when the run begins, and that identity is a fresh
UUID for that materialization. It deliberately requires no registry or other
persistent lifecycle store.

A future optional lifecycle association may let an application explicitly
identify a durable product, service, or long-lived workflow and associate
multiple independent runs with it. For example, a model-training run and later
inference-service runs could opt into the same lifecycle identity. The
application would supply that stable identity; SDKs must not silently create or
persist one.

This association would be organizational rather than causal. It must not
replace actual Artifact, ArtifactSet, Execution, and Event references when
constructing lineage, and records without it must remain fully conformant.

### Portable exchange and trust

#### OCLP Archive

An OCLP Archive would be a portable, self-validating snapshot of records. It
is a logical package format, not a requirement to use ZIP, tar, or any
particular object-store layout. A directory, compressed file, or object-store
prefix could carry the same archive.

An archive should include an immutable archive manifest, canonical JSON record
documents addressed by digest, and a compact inventory or index. It may take
either form:

- **Reference archive**: records, manifest, and durable references to external
  Artifact bytes.
- **Self-contained archive**: those records plus selected Artifact payload
  bytes for an offline audit, release handoff, or reproduction exercise.

ArtifactSet and Archive solve different problems. An ArtifactSet makes a
logical, content-bound statement that named Artifacts belong together. An
Archive is a transfer and inspection envelope that snapshots records and
optionally their payloads.

#### Trust and safety

- Add a path for signed records or signed archive manifests, so a consumer can
  verify who attested to a shared history.
- Publish redaction guidance for sensitive parameters, locators, diagnostics,
  and other metadata that may be retained longer than operational logs.

### Ecosystem implementations

- Extend Cyclops with live Event tailing, run comparison, integrity diagnostics,
  and saved graph views.

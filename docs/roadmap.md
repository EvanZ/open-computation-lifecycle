# Roadmap

This page is non-normative. It describes directions being considered for OCLP
implementations and the surrounding ecosystem; it does not add requirements to
the Core protocol.

OCLP Core defines portable records and their lineage semantics. It deliberately
does not require a database, object store, stream broker, or observability
vendor. Implementations should be able to preserve the same records while
changing where they are retained, indexed, or delivered.

## Future stores and delivery

The next implementation work should distinguish **durable record stores** from
**delivery sinks**. A store is an authoritative place to retrieve an OCLP
record by identity. A sink copies selected records to another system for
streaming, operations, or analysis.

| Direction | Role | Intended use |
| --- | --- | --- |
| File store | Durable local store | Portable JSON records for fixtures, local runs, inspection, and Git-adjacent workflows. |
| DuckDB store | Local store and index | Fast local lookup, query, and graph exploration. |
| S3-compatible store | Durable shared archive | Immutable UUID-addressed record history with canonical-JSON integrity checks for teams and long-running projects. |
| Kafka exporter | Streaming delivery sink | Delivers records to downstream data and platform systems; consumers deduplicate by record identity. |
| OTLP exporter | Observability delivery sink | Projects selected OCLP lifecycle and diagnostic facts into an OpenTelemetry Collector and existing observability backends. |

### File store

A file-backed store is the most direct reference implementation: one canonical
JSON document per record, indexed by its UUID and optionally arranged under a
canonical-JSON integrity-hash layout. It should be easy to inspect, copy, include in a test fixture, or put
behind a static artifact server. A lightweight manifest or index may accelerate
enumeration, but the records remain authoritative.

### DuckDB store

DuckDB is useful locally because it supports efficient lineage and chronology
queries without operating a server. It is an implementation choice, not a
protocol requirement. A DuckDB index may coexist with a file or object-backed
source of truth and be rebuilt from immutable records.

### S3-compatible store

An object store should preserve the same UUID record layout as a file store
while adding shared durability and scale. Writers should use conditional,
create-once writes for immutable records so duplicate publication is safe.
An implementation can maintain a separate mutable index for discovery, but
must not overwrite an accepted record to update that index.

### Kafka exporter

Kafka is best treated as a delivery mechanism, not the sole system of record.
An exporter can publish selected OCLP records to a topic after they are safely
committed to a durable store. Delivery must tolerate retries and duplicate
messages; consumers should deduplicate using the record's stable identity and
content binding. Partitioning by a stable project or record key can preserve a
useful local order without claiming a global chronology.

### OTLP exporter

OCLP records are richer than conventional application logs, but selected
Events, Evidence, and Diagnostics can be projected into operational telemetry.
An OTLP exporter would allow teams to send that view to an OpenTelemetry
Collector, which can route it to an existing logging or observability backend.
The OCLP record remains canonical; the OTLP representation is a derived,
lossy operational view.

## Design rule

The intended implementation shape is:

```text
producer -> durable RecordStore -> optional Exporters
                                  |- Kafka
                                  `- OTLP Collector -> observability backend
```

This preserves a durable, inspectable OCLP history even if a stream consumer or
observability backend is unavailable. It also keeps the protocol independent of
storage vendors and makes a local-first implementation practical.

## Sequencing

The likely order is:

1. File store, as a portable and transparent reference implementation.
2. S3-compatible object store, reusing the file-store layout and immutability
   model.
3. A generic exporter interface with a Kafka implementation.
4. An OTLP exporter for integration with operational telemetry systems.

DuckDB remains valuable as a local query and exploration index throughout, but
need not be the canonical store for every deployment.

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

- Define a small `RecordStore` and exporter interface in SDKs without
  standardizing a database schema or storage vendor.
- Define an artifact-resolution service interface for resolving an immutable
  Artifact identity to available, mutable locations without placing those
  locations on every Execution reference.
- Build framework adapters for orchestration systems, ML training and
  evaluation, batch processing, and request-scoped inference.
- Extend Cyclops with live Event tailing, run comparison, integrity diagnostics,
  and saved graph views.

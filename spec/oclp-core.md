# OCLP Core Specification

Status: Experimental draft 0.1

## 1. Purpose

OCLP specifies how a typed, content-addressed computation graph evolves through
durable records and events. A conforming producer can describe what was
requested, what implementation was selected, which exact inputs were consumed,
which artifacts were produced, and what evidence was recorded. A conforming
consumer can validate and traverse those records without understanding the
producer's programming language or scheduler.

## 2. Non-goals

OCLP does not define:

- a workflow authoring language;
- a scheduler or distributed execution engine;
- an artifact storage service;
- a container or virtual-machine format;
- domain-specific dataset, model, or metric semantics.

Those systems may implement, transport, or extend OCLP records.

## 3. Core records

### 3.1 Definition

A Definition identifies a computation that may be invoked. It declares an
implementation and named input and output ports. An implementation locator is
descriptive; runtimes decide whether and how they support it.

### 3.2 Invocation

An Invocation binds one Definition to exact input artifacts and parameters. It
is the durable identity of a requested application of a computation, not an
individual execution attempt.

### 3.3 Artifact

An Artifact describes immutable content using a media type, byte size, and
content digest. Locations are replaceable retrieval hints and do not determine
artifact identity.

### 3.4 Evidence

Evidence records the result of evaluating a named contract against another
record. Evidence is immutable and may itself be content-addressed.

### 3.5 Event

An Event records a durable fact about an Invocation or attempt. Events are
ordered within an Invocation by a non-negative sequence number. Event types are
an extensible vocabulary; the core lifecycle vocabulary will be specified after
dogfooding establishes the required transition boundaries.

## 4. Identity and serialization

Every record has a stable `id`, `kind`, and `oclp_version`. Artifact content is
identified with SHA-256 in draft 0.1. References may include both a logical ID
and a digest; when a digest is present, consumers must treat a mismatch as an
integrity failure.

OCLP draft 0.1 uses the I-JSON data model and RFC 8785 JSON Canonicalization
Scheme (JCS) for record hashing. YAML may be accepted as an authoring format,
but it must be converted to the JSON data model before validation or hashing.
Protocol Buffer bindings may be added later but are not canonical record bytes.

## 5. Lineage

Lineage is derived from explicit bindings rather than a separate mutable graph:

```text
Artifact -> consumed by Invocation -> produces Artifact
Definition -> instantiated by Invocation
Evidence -> checks Definition, Invocation, Artifact, or Event
Event -> records the lifecycle of Invocation or attempt
```

An implementation may build indexes for traversal, but those indexes are not
canonical protocol truth and must be rebuildable from immutable records.

## 6. Publication invariants

Draft 0.1 establishes these invariants:

1. Published artifacts are immutable.
2. Invocation input bindings do not change after execution begins.
3. Attempts do not replace Invocation identity.
4. Completion must not precede publication of required outputs and evidence.
5. Mutable names such as `latest` are references, never artifact identities.
6. Replaying an already accepted event must be idempotent.

## 7. Extensions

Records reject unknown top-level fields. Extensions should initially be placed
under `annotations` using namespaced keys. Future drafts may define registered
media types and extension profiles for datasets, models, checkpoints, metrics,
reports, and quality evidence.

## 8. Conformance

A draft-0.1 record producer is conformant when every emitted core record
validates against the corresponding published JSON Schema. A record consumer is
conformant when it accepts every valid fixture and rejects every invalid fixture
in the conformance suite. Runtime conformance is intentionally deferred.

# OCLP Core Specification

Status: Experimental draft 0.1 (`0.1.0-draft`).

## 1. Purpose and conformance language

OCLP specifies a durable, typed, content-addressed description of a computation
and its lifecycle. It lets a producer describe a requested computation, the
implementation selected, its inputs and outputs, and checks performed on those
records. It does not define a workflow language, scheduler, storage service,
container format, or domain-specific semantics.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this document
are normative. A core record is one of `artifact`, `artifact_set`,
`definition`, `invocation`, `evidence`, or `event`. Producers MUST emit
records that satisfy the applicable rules below. Consumers MUST reject unknown
fields and invalid values, and MUST preserve the distinction between a logical
ID and a content digest.

The published JSON Schemas and cross-language conformance vectors are derived,
executable conformance artifacts. They do not replace the field semantics
defined here. SDKs, including the Python package in this repository, are
implementations of this specification and MUST NOT define additional protocol
meaning.

## 2. JSON and canonical form

Records use the I-JSON data model. Strings are JSON strings; arrays are ordered;
objects have string keys; integer values have no fractional component. Values in
`annotations`, `parameters`, `details`, and `data` MAY be any JSON value.

Draft 0.1 uses [RFC 8785 JSON Canonicalization Scheme
(JCS)](https://www.rfc-editor.org/rfc/rfc8785) to produce canonical record
bytes. YAML MAY be an authoring format, but it MUST first be converted to JSON
before validation or hashing. Protocol Buffer bindings, if introduced, are not
canonical record bytes.

The tables below describe accepted input. A field marked **default** may be
omitted on input; the default is present in the expanded canonical record. A
field marked **optional** is omitted from canonical output when absent or null.
`kind` and `oclp_version` have protocol defaults to make compact authored
records unambiguous, but producers SHOULD emit them explicitly when
interchanging raw JSON. A consumer that expands defaults MUST use the values
stated here before canonicalizing. An implementation MAY require explicit
discriminators at a parsing boundary, provided its serializer emits the same
canonical record.

All record and value-object objects are closed: fields not defined by this
specification are invalid. Use `annotations` for extension data until a
profile or later draft defines a field.

## 3. Shared values and core envelope

### 3.1 Digest

A Digest identifies immutable bytes or canonical record bytes.

| Field | Input status and JSON type | Constraints and use |
| --- | --- | --- |
| `algorithm` | default; string | MUST be `"sha256"`. Its explicit label leaves room for a future algorithm migration. |
| `value` | required; string | Exactly 64 lowercase hexadecimal characters: the SHA-256 digest, without an algorithm prefix. |

An Artifact's `digest` hashes the Artifact's described content bytes. A record
digest hashes the record's JCS canonical bytes. These are different objects and
MUST NOT be confused.

### 3.2 RecordReference

A RecordReference names another OCLP record.

| Field | Input status and JSON type | Constraints and use |
| --- | --- | --- |
| `id` | required; string | Non-empty logical record ID. It enables a human-meaningful or registry lookup. |
| `digest` | optional; Digest | When supplied, it binds the reference to one exact canonical record and protects against a mutable or ambiguous logical ID. |

Individual fields below state when `digest` is mandatory. A consumer that
resolves a reference with a digest MUST treat a resolved record whose canonical
digest differs as an integrity failure.

### 3.3 Core record envelope

Every core record has this envelope. The record-specific table adds its fields.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `oclp_version` | default; string | MUST be `"0.1.0-draft"`. It selects the core vocabulary and validation rules. |
| `kind` | default; string | One of the record-kind constants stated below. It discriminates the record shape. |
| `id` | required; string | Non-empty stable logical ID. It is a name for the record, not a claim that two records with the same ID have identical content. |
| `annotations` | default; object | Empty object by default. Producer-defined JSON extension data. Keys SHOULD be namespaced, for example `"example.org/owner"`. |

Logical identity and content identity are deliberately separate: a stable ID
supports references and discovery; a digest binds an exact immutable version.

### 3.4 PortDefinition

A PortDefinition declares an input or output interface of a Definition.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `name` | required; string | Non-empty port name used as the key in an Invocation's `inputs`. |
| `cardinality` | default; string | `"one"` or `"many"`; default `"one"`. It declares whether the application interface expects one or multiple values. |
| `required` | default; boolean | Default `true`. It distinguishes an optional interface port from a port that must be bound for a successful invocation. |
| `media_types` | default; array of strings | Empty array by default. Acceptable media types, if the Definition declares them. Empty means no media-type restriction is declared by the core record. |

### 3.5 Implementation

An Implementation tells a consumer what executable realization a Definition
selects. It is descriptive: the protocol does not require a consumer to fetch
or execute it.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `kind` | required; string | `"python-callable"`, `"container"`, `"command"`, or `"other"`. It makes the locator interpretable without prescribing one runtime. |
| `locator` | required; string | Non-empty runtime-specific location, such as an import target, image name, or command identifier. It is not itself immutable. |
| `digest` | optional; Digest | A runtime fingerprint, such as an image digest or implementation hash. Its exact semantics are declared by the producer. |
| `artifact` | optional; RecordReference | An Artifact representing code or a runtime package, such as a source bundle, wheel, or container manifest. If present, its record digest is REQUIRED. |

`digest` and `artifact` serve complementary purposes: the former is a
runtime-defined fingerprint; the latter makes source or package bytes available
as an ordinary, independently describable Artifact.

### 3.6 ContractReference

A ContractReference identifies a rule set evaluated by Evidence.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `id` | required; string | Non-empty contract identifier. |
| `version` | required; string | Non-empty contract version. A version makes an Evidence result interpretable after a rule changes. |

## 4. Core records

### 4.1 Artifact (`kind: "artifact"`)

An Artifact describes one immutable byte sequence. It is the basic unit for
inputs, outputs, code packages, manifests, reports, and other durable content.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `media_type` | required; string | Non-empty media type describing the content bytes, normally an IANA or vendor media type. |
| `digest` | required; Digest | SHA-256 of the exact content bytes. This, rather than a location, establishes content identity. |
| `size` | required; integer | Non-negative byte count of the content. It supports retrieval checks without reading all bytes. |
| `locations` | default; array of strings | Empty array by default. Replaceable retrieval hints such as object-store URLs. They MUST NOT determine identity and MAY become stale. |
| `schema_uri` | optional; string | Identifies a schema or profile governing the content when applicable. It does not validate the bytes by itself. |

The envelope `kind` MUST be `"artifact"`. Publishing the same bytes under a
different retrieval location does not create different content. For very large
or remote data, an Artifact MAY describe an immutable manifest or snapshot
instead of hashing a whole live service.

### 4.2 ArtifactSet (`kind: "artifact_set"`)

An ArtifactSet is an immutable, named logical collection of exact Artifacts. It
is suitable for a release containing a schema, configuration, metrics, and
other independently retrievable files. It does not imply an archive, directory,
or retrieval layout and it does not nest sets in draft 0.1.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `members` | required; non-empty array of ArtifactSetMember | The ordered collection. Member names MUST be unique; each member MUST reference an Artifact with a record digest. |

Each `ArtifactSetMember` has:

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `name` | required; string | Non-empty stable member name within the set. It makes a logical release navigable independent of storage layout. |
| `artifact` | required; RecordReference | Reference to an Artifact. The reference digest is REQUIRED, binding the set to one exact Artifact record. |
| `role` | optional; string | Non-empty semantic role such as `"schema"`, `"configuration"`, or `"metrics"`. |
| `required` | default; boolean | Default `true`. It states whether a consumer needs this member to use the set for its intended purpose. |

### 4.3 ComputationDefinition (`kind: "definition"`)

A Definition declares a reusable computation. It describes what may be invoked;
it is not an execution or an attempt.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `implementation` | required; Implementation | The selected executable realization and optional immutable code binding. |
| `input_ports` | default; array of PortDefinition | Empty array by default. Declared input interface. Names MUST be unique within this direction. |
| `output_ports` | default; array of PortDefinition | Empty array by default. Declared output interface. Names MUST be unique within this direction. |

The same port name MAY appear once among inputs and once among outputs because
the directions are separate namespaces. Port declarations express the intended
interface; draft 0.1 does not require a runtime to enforce every declaration.

### 4.4 Invocation (`kind: "invocation"`)

An Invocation is the durable request to apply one Definition with parameter
values and input bindings. Multiple execution attempts, retries, or schedulers
MUST NOT replace its identity.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `definition` | required; RecordReference | Definition being requested. A digest MAY bind a particular definition revision and is strongly recommended when reproducibility matters. |
| `parameters` | default; object | Empty object by default. Producer-defined JSON parameter values. The Definition or a referenced contract gives them domain meaning. |
| `inputs` | default; object of arrays of RecordReference | Empty object by default. Keys are declared input-port names; each value is an ordered list of references bound at invocation time. Artifact references SHOULD include a digest for reproducibility. |
| `requested_outputs` | default; array of strings | Empty array by default. Names of outputs requested by the caller. It records intent, not proof of publication. |

An Invocation does not directly contain output Artifacts in this draft. A
lifecycle Event records publication, preserving the distinction between a
request and observed execution facts.

### 4.5 Evidence (`kind: "evidence"`)

Evidence records the result of evaluating a versioned contract against a subject
record. It keeps protocol-level truth compact while retaining domain-specific
diagnostics in `details`.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `subject` | required; RecordReference | Record checked by the contract. A digest MAY bind an exact subject revision and is recommended for immutable audit evidence. |
| `contract` | required; ContractReference | The named, versioned rule set evaluated. |
| `outcome` | required; string | `"pass"`, `"fail"`, or `"error"`. `"error"` means the evaluation could not complete or produce a reliable result. |
| `observed_at` | required; string, `date-time` | Time at which the result was observed. Use an RFC 3339 timestamp with an offset for portable interchange. |
| `details` | default; object | Empty object by default. JSON diagnostics, including a richer domain status such as a warning, without extending the core outcome vocabulary. |

### 4.6 LifecycleEvent (`kind: "event"`)

An Event records an observed durable fact about an Invocation or one of its
attempts. The event vocabulary is intentionally extensible; producers SHOULD
document their event types and their `data` shape.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `invocation` | required; RecordReference | Invocation to which the fact belongs. A digest MAY bind the precise invocation revision. |
| `event_type` | required; string | Non-empty producer-defined event name, such as `"outputs-published"`. It identifies the meaning of `data`. |
| `occurred_at` | required; string, `date-time` | Time the event fact occurred. Use an RFC 3339 timestamp with an offset for portable interchange. |
| `sequence` | required; integer | Non-negative sequence number. Events for one Invocation are ordered by this value; producers MUST NOT give two distinct events for an Invocation the same sequence. |
| `attempt_id` | optional; string | Producer-defined execution-attempt identifier. Omit it for a fact about the Invocation as a whole. |
| `data` | default; object | Empty object by default. JSON event payload. For an output-publication event, it SHOULD name the published Artifact references. |

## 5. Lineage and publication invariants

Lineage is derived from explicit bindings, not from a separate mutable graph:

```text
Artifact -> consumed by Invocation -> produces Artifact
Artifact -> may bind a Definition implementation
ArtifactSet -> names exact Artifacts in a logical collection
Definition -> instantiated by Invocation
Evidence -> checks Definition, Invocation, Artifact, ArtifactSet, or Event
Event -> records the lifecycle of an Invocation or attempt
```

Draft 0.1 establishes these invariants:

1. Published Artifacts and ArtifactSets are immutable.
2. Invocation input bindings do not change after execution begins.
3. Attempts do not replace Invocation identity.
4. Completion MUST NOT precede publication of required outputs and evidence.
5. Mutable names such as `latest` or `current` are retrieval references, never artifact identities.
6. Replaying an already accepted event MUST be idempotent.

Implementations MAY build indexes for traversal, but those indexes are not
canonical protocol truth and MUST be rebuildable from immutable records.

## 6. Extensions and profiles

Unknown top-level fields are invalid. Producers SHOULD put experimental,
namespaced extension data under `annotations`. A profile is a versioned,
optional layer of normative specifications that composes with this Core. It
adds a bounded interoperability contract for one concern—such as dataset
snapshots or agent execution—without changing the Core record vocabulary.

### 6.1 Profile declaration

A published profile specification MUST declare all of the following:

| Declaration | Requirement |
| --- | --- |
| Profile ID | A non-empty stable identifier, unique within the profile publisher's namespace. It is the value carried in any profile-defined `oclp_profile` field. |
| Profile version | A non-empty version identifier. A profile version is independent of the OCLP Core version. |
| Core compatibility | The OCLP Core version or versions for which the profile is defined. |
| Dependencies | The exact profile IDs and compatible versions on which it depends, or an explicit declaration that it has none. |
| Extension surfaces | The Core locations whose content it defines: an Artifact's bytes, a named Event `data` payload, or namespaced keys within an existing JSON extension object. |
| Conformance package | A normative profile specification, published schema or schemas where applicable, and valid/invalid vectors with canonical bytes and digests whenever the profile defines canonical JSON. |

The normative profile specification is authoritative. Schemas, vectors, and SDK
bindings are derived conformance artifacts.

### 6.2 Profile surfaces

A profile MAY define one or more of these surfaces:

1. **Artifact content.** It defines an Artifact payload format and MUST declare
   the required `media_type`. It SHOULD declare the required `schema_uri`.
   The profile MUST state whether the Artifact digest hashes the payload bytes,
   a canonical manifest, or another bounded immutable representation.
2. **Event convention.** It defines one or more `event_type` values and the
   schema and semantics of their `data` objects. It MUST state whether event
   ordering, attempt binding, or referenced Artifacts are required.
3. **Extension-object convention.** It defines namespaced keys and value shapes
   within `annotations`, `parameters`, `details`, or `data`. It MUST NOT
   assign meaning to an unnamespaced key outside a profile-owned object.

A profile MUST NOT add arbitrary top-level fields to a Core record, weaken a
Core invariant, redefine a Core field, or require a consumer that does not
claim that profile to implement its domain behavior.

### 6.3 Composition

Profiles compose by explicit dependency, not by implicit convention. A profile
that relies on another profile MUST declare its dependency and the compatible
version or versions. A producer MAY apply independent profiles to the same
computation graph when their declared surfaces do not conflict. A consumer
claims support for a profile only when it implements that profile's
conformance package and all declared dependencies.

Core-only consumers MAY retain, index, and traverse profile-bearing records
without understanding profile semantics. They MUST continue to enforce Core
validation and integrity rules. A profile consumer MUST reject a record or
payload that claims the profile but violates its declared schema or semantic
rules.

The dataset-snapshot profile is the first profile under this framework: it
defines canonical Artifact content. Future profiles may standardize agent,
model-service, and MCP event conventions without making those concepts Core
requirements.

## 7. Design rationale (non-normative)

This section explains the consequential design choices in this draft. It does
not alter the normative requirements in the preceding sections.

| Decision | Rationale and consequence |
| --- | --- |
| Logical IDs and content digests are separate. | A stable name supports discovery, references, and a continuing business concept; a digest binds the exact bytes or record revision. Conflating them makes either mutable names unsafe or immutable content impossible to refer to conveniently. |
| Artifact content identity uses SHA-256; record identity uses JCS canonical bytes. | Content and metadata change independently. A file can remain identical while its retrieval locations change; conversely, a record's annotations or bindings can change without changing its described payload. RFC 8785 gives implementations in different languages one reproducible record-byte representation. |
| Core objects are closed and extension data is bounded. | Permissive top-level fields make independently produced records ambiguous and difficult to validate. Namespaced extension objects retain local flexibility while keeping the portable core legible. |
| A Definition, Invocation, and attempt are distinct. | A reusable computation is not a request to run it, and a request is not one scheduler attempt. Preserving those three concepts lets retries, migrations, and multiple execution systems report facts without overwriting lineage. |
| Code and runtime packages are ordinary Artifacts. | Source bundles, wheels, and container manifests have the same immutable-byte and retrieval concerns as data. Reusing Artifact avoids a special code-object hierarchy while allowing an Implementation to bind exact source when available. |
| ArtifactSet is logical and non-nested in draft 0.1. | Releases need a durable named collection, but archive formats, directory layouts, and recursive collection semantics are storage concerns. A flat, digest-bound member list is simple to traverse and can be composed by publishing another explicit set or profile later. |
| Profiles compose rather than extend Core records. | Datasets, agents, model services, and MCP tools need richer domain semantics, but not every OCLP consumer should implement them. Explicit profile declarations and dependencies make those layers interoperable without turning Core into a domain framework. |

These choices favor durable auditability and cross-language traversal over
implicit runtime behavior. The dogfood implementations and conformance corpus
are expected to reveal where their costs outweigh their benefits before 1.0.

## 8. Conformance

A draft-0.1 producer is conformant when its emitted core records validate
against the published core JSON Schema and satisfy this specification. A
consumer is conformant when it accepts every valid fixture, rejects every
invalid fixture, and reproduces published JCS canonical JSON and record digests
for the digest vectors. Runtime behavior and scheduler interoperability are
intentionally outside draft-0.1 conformance.

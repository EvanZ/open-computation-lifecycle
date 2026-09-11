# OCLP Core Specification

Status: Experimental draft 0.2 (`0.2.0-draft`).

## 1. Purpose and conformance language

OCLP specifies a durable, typed, content-addressed description of a computation
and its lifecycle. It lets a producer describe a reusable computation, each
concrete execution of it, the selected implementation, inputs and outputs, and checks performed on those
records. It does not define a workflow language, scheduler, storage service,
container format, or domain-specific semantics.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this document
are normative. A core record is one of `artifact`, `artifact_set`,
`computation`, `execution`, `evidence`, or `event`. Producers MUST emit
records that satisfy the applicable rules below. Consumers MUST reject unknown
fields and invalid values, and MUST preserve the distinction between a logical
ID and a content digest.

The published JSON Schemas and cross-language conformance vectors are derived,
executable conformance artifacts. They do not replace the field semantics
defined here. SDKs, including the Python reference implementation, are
implementations of this specification and MUST NOT define additional protocol
meaning.

## 2. Design rationale (non-normative)

This section explains the consequential design choices in this draft. It does
not alter the normative requirements in the preceding sections.

| Decision | Rationale and consequence |
| --- | --- |
| Logical IDs and content digests are separate. | A stable name supports discovery, references, and a continuing business concept; a digest binds the exact bytes or record revision. Conflating them makes either mutable names unsafe or immutable content impossible to refer to conveniently. |
| Artifact content identity uses SHA-256; record identity uses JCS canonical bytes. | Content and metadata change independently. A file can remain identical while its retrieval locations change; conversely, a record's annotations or bindings can change without changing its described payload. An optional producer-created timestamp is part of the immutable record revision, not mutable catalog state. RFC 8785 gives implementations in different languages one reproducible record-byte representation. |
| Core objects are closed and extension data is bounded. | Permissive top-level fields make independently produced records ambiguous and difficult to validate. Namespaced extension objects retain local flexibility while keeping the portable core legible. |
| A Computation and Execution are distinct; an Execution is one actual run. | A reusable computation is not a particular run with concrete inputs. Every retry, migration, or re-run is a new Execution. OCLP therefore does not create a second Attempt identity beneath Execution; producers preserve retry relationships through parentage, annotations, or producer-defined Events when needed. |
| Evidence carries its source-bound evaluator directly. | A clean runtime exit and an evaluated quality or release gate are different claims. A Computation declares the evaluator implementations required for success, while Evidence records each evaluator's actual outcome. This avoids a separate naming record for a fact that Evidence already represents. Core validates the binding and outcome, not the evaluator's domain logic. |
| Derivation is a DAG, while references and audit facts are not. | Scheduling, cache invalidation, and human lineage views need a topological order. Input and output bindings therefore form an acyclic Artifact/ArtifactSet-to-Execution graph; Events, Evidence, annotations, and collections remain flexible overlays rather than hidden derivation edges. |
| Execution parentage is explicit and separate from derivation. | A parent flow can orchestrate child Executions without claiming their outputs as its own. The execution hierarchy supports scheduler and human views while leaving the Artifact/ArtifactSet-to-Execution derivation DAG acyclic. |
| Every Implementation declares an explicit source basis; a dirty Git overlay is bound to that basis. | Consumers must be able to distinguish Git source, a bound package Artifact, a versioned service, and unavailable provenance. A Git commit is the reviewed baseline; an optional, exact ArtifactSet overlay makes source edits content-addressable without pretending to resolve a whole dependency closure. Machine-local checkout facts remain on Events. |
| Diagnostics are a shared typed value, not an application-specific detail shape. | Events describe execution state and Evidence describes evaluator results; both can carry the same compact code, message, stage, and optional detail Artifact. Consumers can display those fields without learning a producer's private JSON conventions. |
| ArtifactSet is logical and non-nested in draft 0.2. | Releases need a durable named collection, but archive formats, directory layouts, and recursive collection semantics are storage concerns. A flat, digest-bound member list is simple to traverse and can be composed by publishing another explicit set or profile later. |
| Profiles compose rather than extend Core records. | Datasets, agents, model services, and MCP tools need richer domain semantics, but not every OCLP consumer should implement them. Explicit profile declarations and dependencies make those layers interoperable without turning Core into a domain framework. |

These choices favor durable auditability and cross-language traversal over
implicit runtime behavior. The dogfood implementations and conformance corpus
are expected to reveal where their costs outweigh their benefits before 1.0.


## 3. JSON and canonical form

Records use the I-JSON data model. Strings are JSON strings; arrays are ordered;
objects have string keys; integer values have no fractional component. Values in
`annotations`, `parameters`, `details`, and `data` MAY be any JSON value.
`profiles` is always either `null` or a non-empty JSON object whose values are
JSON objects.

Draft 0.2 uses [RFC 8785 JSON Canonicalization Scheme
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

## 4. Shared values and core envelope

### 4.1 Digest

A Digest identifies immutable bytes or canonical record bytes.

| Field | Input status and JSON type | Constraints and use |
| --- | --- | --- |
| `algorithm` | default; string | MUST be `"sha256"`. Its explicit label leaves room for a future algorithm migration. |
| `value` | required; string | Exactly 64 lowercase hexadecimal characters: the SHA-256 digest, without an algorithm prefix. |

An Artifact's `digest` hashes the Artifact's described content bytes. A record
digest hashes the record's JCS canonical bytes. These are different objects and
MUST NOT be confused.

### 4.2 RecordReference

A RecordReference names another OCLP record.

| Field | Input status and JSON type | Constraints and use |
| --- | --- | --- |
| `id` | required; string | Non-empty logical record ID. It enables a human-meaningful or registry lookup. |
| `digest` | optional; Digest | When supplied, it binds the reference to one exact canonical record and protects against a mutable or ambiguous logical ID. |

Individual fields below state when `digest` is mandatory. A consumer that
resolves a reference with a digest MUST treat a resolved record whose canonical
digest differs as an integrity failure.

### 4.3 Record resolution

Core records are portable descriptions, not a storage API. An implementation
MAY provide a record resolver, registry, bundle reader, or other lookup service
for `RecordReference` values. Such a service does not change record meaning.

A resolver receiving a reference with a `digest` MUST resolve the exact
canonical record whose digest equals that value, verify the digest after parsing
and canonicalizing, and reject a record whose `id` differs from the reference.
A resolver receiving an ID-only reference MUST reject an absent or ambiguous
match; it MUST NOT silently select an arbitrary revision. A resolver MAY expose
an explicit producer-defined revision-selection operation separately from Core
reference resolution.

Resolving an Artifact record is distinct from retrieving its content bytes. A
resolver MAY maintain current storage-location hints indexed by an Artifact's
content digest, but those hints are implementation metadata rather than Core
record fields. A consumer that retrieves bytes MUST verify the bytes against the
Artifact content digest before treating them as the bound Artifact.

### 4.4 Core record envelope

Every core record has this envelope. The record-specific table adds its fields.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `oclp_version` | default; string | MUST be `"0.2.0-draft"`. It selects the core vocabulary and validation rules. |
| `kind` | default; string | One of the record-kind constants stated below. It discriminates the record shape. |
| `id` | required; string | Non-empty stable logical ID. It is a name for the record, not a claim that two records with the same ID have identical content. |
| `name` | optional; string | Non-empty, producer-supplied human-readable name. It is not an identity, unique key, or reference target. A consumer MAY display it, but MUST use `id` and an optional record digest for lookup and integrity. Because it is part of the immutable record bytes, changing it produces a new record revision. |
| `description` | optional; string | Non-empty plain-text human-readable explanation of the record's purpose, interpretation, or intended use. It is longer-form metadata than `name`, not a markup-rendering contract, identity, unique key, or reference target. Because it is part of the immutable record bytes, changing it produces a new record revision. |
| `profiles` | default; `null` or non-empty object | A producer MUST emit `null` when no profile applies. Otherwise keys are non-empty Profile IDs and each value is a profile-owned JSON object. A key claims that the record follows that profile's binding rules. Core validates only this container shape; a profile consumer validates the named value. An empty object is invalid. |
| `annotations` | default; object | Empty object by default. Producer-defined JSON extension data. Keys SHOULD be namespaced, for example `"example.org/owner"`. Annotations do not claim a normative profile contract. |

Logical identity and content identity are deliberately separate: a stable ID
supports references and discovery; a digest binds an exact immutable version.
A record `name`, when present, is a concise human-facing label; `description`
is longer-form plain-text explanation; and `annotations` carry producer-defined
structured semantics. All are portable immutable metadata, not mutable registry
aliases or substitutes for identity.

### 4.5 PortDefinition

A PortDefinition declares an input or output interface of a Computation.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `name` | required; string | Non-empty port name used as the key in an Execution's `inputs` or `outputs`. |
| `cardinality` | default; string | `"one"` or `"many"`; default `"one"`. It declares whether the application interface expects one or multiple values. |
| `required` | default; boolean | Default `true`. It distinguishes an optional interface port from a port that must be bound for a successful execution. |
| `media_types` | default; array of strings | Empty array by default. Acceptable media types, if the Computation declares them. Empty means no media-type restriction is declared by the core record. |

### 4.6 ParameterDefinition

A ParameterDefinition declares one non-Artifact argument in a Computation
interface. It is deliberately distinct from a PortDefinition: ports bind
durable Artifacts or ArtifactSets, while parameters bind small JSON values such
as a fold count, locale, or execution mode.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `name` | required; string | Non-empty parameter name used as the key in an Execution's `parameters`. A name MUST be unique within the Computation and MUST NOT overlap an input-port name. |
| `schema` | required; object | A JSON Schema subschema that describes the parameter value. Its standard vocabulary, including `type`, `enum`, `default`, and `description`, avoids an OCLP-specific type DSL and remains usable across languages. |
| `required` | default; boolean | Default `true`. When `false`, the Computation accepts an Execution without a concrete value; a JSON Schema `default`, if supplied, describes the implementation's effective default. |

Parameter declarations describe the reusable interface, not a particular
language's calling syntax. A producer MUST represent durable content consumed
by a Computation as an input-port Artifact or ArtifactSet rather than copying
that content into `parameters`.

### 4.7 Implementation

An Implementation tells a consumer what executable realization a Computation
selects. It is descriptive: the protocol does not require a consumer to fetch
or execute it.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `kind` | required; string | `"python-callable"`, `"container"`, `"command"`, or `"other"`. It makes the locator interpretable without prescribing one runtime. |
| `locator` | required; string | Non-empty runtime-specific location, such as an import target, image name, or command identifier. It is not itself immutable. |
| `source` | required; ImplementationSource | The declared basis for this implementation. It is a discriminated `GitSource`, `ArtifactSource`, `ServiceSource`, or `OpaqueSource`; it MUST NOT be omitted. |
| `digest` | optional; Digest | A runtime fingerprint, such as an image digest or implementation hash. Its exact semantics are declared by the producer. A producer MUST omit it when it would merely restate the linked Artifact's content digest. |
| `artifact` | optional; RecordReference | An Artifact representing code or a runtime package, such as a source bundle, wheel, or container manifest. If present, its record digest is REQUIRED. |

`source`, `digest`, and `artifact` identify distinct concerns. `source`
declares where the implementation comes from; `digest` is a producer-defined
runtime fingerprint; and `artifact` can make separately selected package or
runtime bytes available as an ordinary Artifact. Producers MUST NOT represent
an ad-hoc selected-file hash as a source bundle merely to approximate dependency
closure. If the runtime fingerprint is simply the linked Artifact's content
digest, producers MUST omit `digest`; consumers resolve the Artifact record to
obtain that content identity. The `RecordReference.digest` inside `artifact`
still binds the exact Artifact *record*, which is distinct from the Artifact's
payload-content digest.

#### GitSource

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `kind` | default; string | MUST be `"git"`. |
| `repository` | required; string | Non-empty canonical repository location or identifier selected by the producer. |
| `commit` | required; string | A complete, lowercase hexadecimal Git object ID: 40 characters for SHA-1 repositories or 64 characters for SHA-256 repositories. A branch, tag, or abbreviated hash is invalid. |
| `path` | default; string | Repository-relative source or build-context path. Default `"."`. |
| `dirty` | default; boolean | `true` when the source was observed from a checkout with uncommitted changes relative to `commit`; default `false`. It makes the incomplete source basis explicit rather than forbidding development observations. |
| `overlay` | optional; RecordReference | An exact ArtifactSet describing uncommitted source changes relative to `commit`. Its record digest is REQUIRED. Omit it when the selected source is exactly the Git commit. |

`repository` identifies the canonical source project, not an execution-local
checkout path or merely a configured remote name. A Git commit describes the
reviewed base revision. A `dirty: true` source is valid provenance: it reports
that the observed implementation may differ from that base and MUST NOT be
treated as reproducible from the commit alone. When `overlay` is present,
`dirty` MUST be `true`; the Git source basis is then the commit plus that
immutable overlay and produces a distinct Computation revision. An overlay is a
bounded source delta, not an inferred dependency closure: a producer SHOULD
include a binary Git patch for tracked changes and MAY include selected
untracked source files. Ignored/generated files and secrets MUST NOT be
captured implicitly. Runtime configuration and dependencies belong in their own
input Artifacts or profiles. A Git source does not claim to identify every
runtime dependency or the checkout used by one Execution.

#### ArtifactSource

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `kind` | default; string | MUST be `"artifact"`. |
| `artifact` | required; RecordReference | An Artifact such as a wheel, container manifest, or intentional source archive. Its record digest is REQUIRED. |

#### ServiceSource

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `kind` | default; string | MUST be `"service"`. |
| `locator` | required; string | Non-empty service identity or endpoint selected by the producer. |
| `version` | required; string | Non-empty provider or deployment version. |

#### OpaqueSource

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `kind` | default; string | MUST be `"opaque"`. |
| `reason` | required; string | Non-empty explanation for why a stronger source basis is unavailable. It makes the provenance limitation explicit. |

### 4.8 Diagnostic

A Diagnostic is a compact portable explanation attached to an Event or
Evidence. It does not replace a producer's structured detail data or a full
log/report Artifact. Its fields let a generic consumer present a useful
execution or evaluation summary without interpreting application-owned JSON.

| Field | Input status and JSON type | Constraints and use |
| --- | --- | --- |
| `code` | optional; string | Non-empty producer-defined machine-readable identifier, such as `"input-unavailable"` or `"validation/duplicate-key"`. Consumers MUST treat it as an opaque identifier unless they implement the producer's vocabulary. |
| `message` | optional; string | Non-empty concise human-readable explanation. Producers SHOULD omit secrets and large stack traces. |
| `stage` | optional; string | Non-empty producer-defined execution or evaluation stage, such as `"preflight"`, `"transform"`, or `"validation"`. It is not a workflow language or a globally enumerated vocabulary. |
| `artifact` | optional; RecordReference | A durable Artifact containing richer diagnostic material, such as a log, traceback, or structured report. Its record digest is REQUIRED. |

At least one Diagnostic field MUST be present. The Diagnostic's `artifact`, if
present, is a reference to diagnostic content; its own Artifact record and
payload digest remain the integrity boundary for that content.

## 5. Core records

### 5.1 Artifact (`kind: "artifact"`)

An Artifact describes one immutable byte sequence. It is the basic unit for
inputs, outputs, code packages, manifests, reports, and other durable content.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `id` | required; string | A logical Artifact identifier. It MUST NOT be a content-addressed spelling of this Artifact's `digest`, such as `urn:sha256:<digest-value>`. |
| `media_type` | required; string | Non-empty media type describing the content bytes, normally an IANA or vendor media type. |
| `digest` | required; Digest | SHA-256 of the exact content bytes. This, rather than a location, establishes content identity. |
| `size` | required; integer | Non-negative byte count of the content. It supports retrieval checks without reading all bytes. |
| `created_at` | optional; string (`date-time`) | RFC 3339 timestamp with an explicit UTC offset at which the producer created this immutable Artifact record/materialization. It is part of the record revision when supplied. |
| `locations` | default; array of strings | Empty array by default. Replaceable retrieval hints such as object-store URLs. They MUST NOT determine identity and MAY become stale. |
| `schema_uri` | optional; string | Identifies a schema or profile governing the content when applicable. It does not validate the bytes by itself. |

The envelope `kind` MUST be `"artifact"`. The logical `id` names the resource
across revisions; `digest` identifies the exact bytes of this revision. A
RecordReference binds both the logical ID and, when required, the digest of the
Artifact *record*. Publishing the same bytes under a different retrieval
location does not create different content. For very large or remote data, an
Artifact MAY describe an immutable manifest or snapshot instead of hashing a
whole live service.

`created_at` is deliberately narrower than a generic date field. It is not the
source content's original creation time or filesystem mtime, a storage upload
time, a retrieval time, or the time a consumer observed the Artifact. Producers
MUST omit it when they cannot assert their own creation/materialization time.
Availability, retries, and other execution chronology belong in immutable Event
records instead.

### 5.2 ArtifactSet (`kind: "artifact_set"`)

An ArtifactSet is an immutable, named logical collection of exact Artifacts. It
is suitable for a release containing a schema, configuration, metrics, and
other independently retrievable files. It does not imply an archive, directory,
or retrieval layout and it does not nest sets in draft 0.2.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `members` | required; non-empty array of ArtifactSetMember | The ordered collection. Member names MUST be unique; each member MUST reference an Artifact with a record digest. |
| `created_at` | optional; string (`date-time`) | RFC 3339 timestamp with an explicit UTC offset at which the producer created this immutable named collection. It is part of the record revision when supplied. |

Each `ArtifactSetMember` has:

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `name` | required; string | Non-empty stable member name within the set. It makes a logical release navigable independent of storage layout. |
| `artifact` | required; RecordReference | Reference to an Artifact. The reference digest is REQUIRED, binding the set to one exact Artifact record. |
| `role` | optional; string | Non-empty semantic role such as `"schema"`, `"configuration"`, or `"metrics"`. |
| `required` | default; boolean | Default `true`. It states whether a consumer needs this member to use the set for its intended purpose. |

ArtifactSet `created_at` has the same narrow meaning as Artifact `created_at`:
it describes creation of this exact collection record, not the age of its
members, an archive upload, or later publication. Producers MUST omit it when
that time is unavailable; Events remain the execution chronology.

### 5.3 Computation (`kind: "computation"`)

A Computation declares a reusable computation. It describes what may be
executed; it is not a concrete execution.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `implementation` | required; Implementation | The selected executable realization, required source basis, and optional immutable package/runtime binding. |
| `input_ports` | default; array of PortDefinition | Empty array by default. Declared input interface. Names MUST be unique within this direction. |
| `output_ports` | default; array of PortDefinition | Empty array by default. Declared output interface. Names MUST be unique within this direction. |
| `parameter_definitions` | default; array of ParameterDefinition | Empty array by default. Declared JSON-valued argument interface. Names MUST be unique and MUST NOT overlap `input_ports`. |
| `required_evidence` | optional; array of Implementation | One or more distinct source-bound evaluator implementations that must each produce passing Evidence before an Execution can claim `status: "succeeded"`. Omit it when the Computation has no Core-level acceptance requirements. |

The same port name MAY appear once among inputs and once among outputs because
the directions are separate namespaces. A Computation's logical ID names the
computation across revisions; its record digest binds the particular
implementation and source basis. Port and parameter declarations express the
intended interface. In a resolved record collection, an Execution's parameter
keys MUST be declared by its selected Computation; every required declared
parameter MUST be present and its value MUST validate against the declared JSON
Schema. A runtime MAY validate those rules before publication, but a consumer
validating a resolved collection MUST reject a violated binding.

`required_evidence` are success gates, not a second lifecycle mechanism.
It applies only when an Event claims an Execution succeeded. An Execution can
finish its runtime work yet fail, error, or omit an acceptance check; in that
case its terminal Event MUST NOT claim `status: "succeeded"`. Producers SHOULD
publish the Evidence that satisfies every required evaluator before the
successful terminal Event. A Computation without `required_evidence` makes no Core-level
acceptance claim beyond its lifecycle status.

Core does not prescribe evaluator scheduling or short-circuit behavior. An
implementation MAY stop once success is impossible, but it SHOULD evaluate and
publish every declared evaluator when practical so operators receive a complete
diagnostic picture. Regardless of strategy, a successful terminal Event still
requires every declared evaluator to have passed.

### 5.4 Execution (`kind: "execution"`)

An Execution is one durable, concrete run of one Computation with parameter,
input, and output bindings. A retry, migration, or rerun MUST be a separate
Execution; OCLP does not define a nested Attempt record.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `computation` | required; RecordReference | Computation being executed. A digest MAY bind a particular Computation revision and is strongly recommended when reproducibility matters. |
| `parent_execution` | optional; RecordReference | The Execution that directly orchestrated this Execution. It is an execution-hierarchy relationship, not an input, output, or derivation edge. It MUST resolve to an Execution when the surrounding record collection is resolved. A digest MAY bind one exact parent revision; an ID-only reference is allowed when content-bound parent/child records would otherwise form an immutable reference cycle. Consumers MUST reject an absent or ambiguous ID-only parent during resolution. |
| `parameters` | default; object | Empty object by default. Concrete JSON values bound by name to the selected Computation's `parameter_definitions`. Parameter keys MUST be declared, required definitions MUST be present, and values MUST validate against their declared JSON Schema when the referenced Computation is resolved. |
| `inputs` | default; object of arrays of RecordReference | Empty object by default. Keys are declared input-port names; each value is an ordered list of direct Artifact or ArtifactSet references bound at execution time. Every input reference MUST include a record digest, binding the exact consumed bytes or named collection. An ArtifactSet input records use of the exact named package; its members remain a collection overlay rather than individual derivation edges. |
| `outputs` | optional; object of arrays of RecordReference | Keys are declared output-port names; each value is an ordered list of direct Artifact or ArtifactSet results. Every output reference MUST include a record digest. A producer MUST bind every durable direct result it publishes for the Execution. An ArtifactSet output records that this Execution published the exact named package; its member references remain an overlay, not a second derivation path. |
| `requested_outputs` | default; array of strings | Empty array by default. Names of outputs requested by the caller. It records intent, not proof of publication. |

`outputs` is the durable derivation binding; it is distinct from
`requested_outputs`, which records caller intent. A lifecycle Event MAY repeat
output references to record an operational publication fact, but Event `data`
MUST NOT be the only durable output binding for a published Artifact or
ArtifactSet.

`parent_execution` forms an optional execution hierarchy. A child has at most
one direct parent; a parent may have many children. A resolved hierarchy MUST
be acyclic. Parentage MUST NOT be interpreted as a data-production claim or be
included in derivation-DAG validation. This permits a parent to publish a
manifest Artifact whose content binds exact child records while each child uses
the parent's stable logical ID as an ID-only parent reference.

### 5.5 Evidence (`kind: "evidence"`)

Evidence records the result of applying a source-bound evaluator to a subject
record. The `outcome` states the evaluation result; an optional Diagnostic gives
a compact portable explanation, while `details` retains domain-specific data.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `subject` | required; RecordReference | Record checked by the evaluator. A digest MAY bind an exact subject revision and is recommended for immutable audit evidence. |
| `evaluator` | required; Implementation | The exact evaluator realization and required source basis. Its locator identifies an executable evaluator, command, service, or another implementation form; Core does not impose the evaluator's input or result DSL. |
| `outcome` | required; string | `"pass"`, `"fail"`, or `"error"`. `"error"` means the evaluation could not complete or produce a reliable result. |
| `observed_at` | required; string, `date-time` | Time at which the result was observed. Use an RFC 3339 timestamp with an offset for portable interchange. |
| `diagnostic` | optional; Diagnostic | A compact code, message, stage, or rich-detail Artifact reference associated with this evaluator result. It MUST NOT be used to redefine `outcome`. |
| `details` | default; object | Empty object by default. Domain-specific evaluation data, including a richer status such as a warning, without extending the core outcome vocabulary. Generic consumers MUST NOT infer portable diagnostic semantics from it. |

An Evidence record is the complete portable validation claim: it identifies the
subject, the exact evaluator implementation, when the evaluator observed the
subject, and the resulting outcome. The source and optional runtime/package
bindings in `evaluator` distinguish revisions without a second validation record.

### 5.6 Event (`kind: "event"`)

An Event records an observed durable fact about an Execution. The event
vocabulary is intentionally extensible; producers SHOULD
document their event types and their `data` shape.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `execution` | required; RecordReference | Execution to which the fact belongs. A digest MAY bind the precise Execution revision. |
| `event_type` | required; string | Non-empty producer-defined event name, such as `"outputs-published"`. It identifies the meaning of `data`. |
| `occurred_at` | required; string, `date-time` | Time the event fact occurred. Use an RFC 3339 timestamp with an offset for portable interchange. |
| `sequence` | required; integer | Non-negative sequence number. Events for one Execution are ordered by this value; producers MUST NOT give two distinct Events for an Execution the same sequence. |
| `runtime` | optional; ExecutionContext | Execution-local observations. A producer SHOULD attach the checkout observed for an Execution to its `execution-started` Event rather than put machine-specific facts in the Computation. A producer that needs portable runtime/configuration provenance SHOULD bind an execution-context profile to the Execution. |
| `status` | optional; string | The terminal execution status: `"succeeded"`, `"failed"`, or `"skipped"`. A producer MUST use it only on an Event that reports a terminal Execution result. Its absence means the Event does not make a portable terminal-status claim. |
| `diagnostic` | optional; Diagnostic | A compact code, message, stage, or rich-detail Artifact reference associated with this Event. It commonly explains a failed or skipped terminal event, but MAY also annotate another notable lifecycle observation. |
| `data` | default; object | Empty object by default. JSON event payload. For an output-publication event, it SHOULD name the published Artifact references. |

`ExecutionContext.git_checkout`, when present, records a Git `worktree`, full
observed `commit`, and `dirty` state. The worktree is a local URI or locator and
MAY be omitted when it would disclose sensitive machine layout. It is distinct
from `GitSource.repository`: the former says where this Execution ran; the latter
names the portable source project selected by the Computation.

`status` describes an Execution and belongs on an Event; it is distinct from
Evidence `outcome`, which describes an evaluator result. A failed execution
MAY also publish Evidence, but a consumer MUST NOT require Evidence in order to
identify the execution state. If the selected Computation declares
`required_evidence`, however, a terminal `status: "succeeded"` claim MUST
have Evidence for every declared evaluator with `outcome: "pass"`. A producer MAY define its
event-type vocabulary through a profile; Core does not reserve event-type
strings.

## 6. Lineage and publication invariants

Lineage is derived from explicit bindings, not from a separate mutable graph.
The **derivation graph** contains Artifact, ArtifactSet, and Execution nodes:

```text
Artifact or ArtifactSet -> consumed by Execution -> produces Artifact or ArtifactSet
```

The Computation binding, implementation Artifact and Git source overlay,
Execution parentage, ArtifactSet membership, Evidence, Events, profile
content, annotations, and arbitrary Event `data` are
**reference or audit overlays**, not derivation edges. They MAY be traversed by
consumers, but do not participate in derivation-DAG validation.

Draft 0.2 establishes these invariants:

1. Published Artifacts and ArtifactSets are immutable.
2. Execution input bindings do not change after execution begins.
3. Execution output bindings do not change after publication.
4. In a resolved record collection, every Execution Computation, input, and output reference used for derivation MUST include a record digest and resolve to the stated record ID. Inputs MUST resolve to Artifacts or ArtifactSets. Outputs MUST resolve to Artifacts or ArtifactSets.
5. The derivation graph MUST be acyclic. A consumer validating a resolved record collection MUST reject a missing binding, a wrong-kind binding, or a cycle.
6. Each retry, migration, or rerun is a distinct Execution; an Execution has no separate Attempt identity.
7. A terminal Event that claims `status: "succeeded"` for an Execution whose
   Computation declares `required_evidence` MUST be accompanied in the resolved
   record collection by Evidence that content-binds the exact Execution, names
   every declared evaluator, and has `outcome: "pass"`. A
   producer SHOULD publish that Evidence before the successful terminal Event.
8. Mutable names such as `latest` or `current` are retrieval references, never artifact identities.
9. Replaying an already accepted event MUST be idempotent.
10. In a resolved Execution hierarchy, every `parent_execution` MUST resolve
    to an Execution and the hierarchy MUST be acyclic. It is validated
    independently from the derivation graph.
11. In a resolved record collection, every Execution parameter key MUST be a
    ParameterDefinition on its selected Computation; required definitions MUST
    be bound and every bound value MUST validate against the declared JSON
    Schema.

Implementations MAY build indexes for traversal, but those indexes are not
canonical protocol truth and MUST be rebuildable from immutable records.

## 7. Extensions and profiles

Unknown top-level fields are invalid. Producers SHOULD put experimental,
namespaced extension data under `annotations`. A profile is a versioned,
optional layer of normative specifications that composes with this Core. It
adds a bounded interoperability contract for one concern—such as dataset
snapshots or agent execution—without changing the Core record vocabulary.

The Core-owned `profiles` field is the standard claim surface for a profile
that applies to a Core record. It is `null` when no profile applies and a
non-empty object otherwise. Its keys are Profile IDs and its values are the
binding objects defined by those profiles. The key already identifies the
profile, so a binding object MUST NOT need to repeat that ID. `annotations`
remain free-form producer metadata and MUST NOT by themselves claim a profile.

### 7.1 Profile declaration

A published profile specification MUST declare all of the following:

| Declaration | Requirement |
| --- | --- |
| Profile ID | A non-empty stable identifier, unique within the profile publisher's namespace. When a profile binds to a Core record, this is its key in that record's `profiles` object. A profile Artifact MAY also carry it in a profile-defined `oclp_profile` field. |
| Profile version | A non-empty version identifier. A profile version is independent of the OCLP Core version. |
| Core compatibility | The OCLP Core version or versions for which the profile is defined. |
| Dependencies | The exact profile IDs and compatible versions on which it depends, or an explicit declaration that it has none. |
| Extension surfaces | The Core locations whose content it defines: an Artifact's bytes, a named Event `data` payload, a `profiles` binding object, or namespaced keys within an existing JSON extension object. |
| Conformance package | A normative profile specification, published schema or schemas where applicable, and valid/invalid vectors with canonical bytes and digests whenever the profile defines canonical JSON. |

The normative profile specification is authoritative. Schemas, vectors, and SDK
bindings are derived conformance artifacts.

### 7.2 Profile surfaces

A profile MAY define one or more of these surfaces:

1. **Profile binding.** It defines the value at `profiles[profile-id]` for one
   or more Core record kinds. The binding object MUST declare the profile
   version when the profile has more than one version. A consumer MUST apply
   that profile only after validating this binding object.
2. **Artifact content.** It defines an Artifact payload format and MUST declare
   the required `media_type`. It SHOULD declare the required `schema_uri`.
   The profile MUST state whether the Artifact digest hashes the payload bytes,
   a canonical manifest, or another bounded immutable representation.
3. **Event convention.** It defines one or more `event_type` values and the
   schema and semantics of their `data` objects. It MUST state whether event
   ordering, Execution binding, or referenced Artifacts are required.
4. **Extension-object convention.** It defines namespaced keys and value shapes
   within `annotations`, `parameters`, `details`, or `data`. It MUST NOT
   assign meaning to an unnamespaced key outside a profile-owned object.

A profile MUST NOT add arbitrary top-level fields to a Core record, weaken a
Core invariant, redefine a Core field, or require a consumer that does not
claim that profile to implement its domain behavior.

### 7.3 Composition

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

OCLP Core owns this framework but no domain profile definitions. Profile
publishers independently own their specifications, schemas, fixtures, and
semantic verifiers. An OCLP-maintained profile catalog may provide optional
dataset, execution, or lifecycle profiles without making them Core
requirements.

## 8. Conformance

A draft-0.2 producer is conformant when its emitted core records validate
against the published core JSON Schema and satisfy this specification. A
consumer is conformant when it accepts every valid fixture, rejects every
invalid fixture, and reproduces published JCS canonical JSON and record digests
for the digest vectors. Runtime behavior and scheduler interoperability are
intentionally outside draft-0.2 conformance.

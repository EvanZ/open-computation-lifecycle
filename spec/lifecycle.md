# Lifecycle Profile Specification

Status: Experimental profile for OCLP Core `0.1.0-draft`.

## 1. Purpose

The lifecycle profile gives an Invocation a portable execution timeline. Core
Events always have an `occurred_at` timestamp, but Core deliberately leaves
their `event_type` producer-defined. A consumer therefore cannot infer that an
arbitrary earliest Event means requested, started, or completed. A producer
that claims this profile supplies those meanings without adding mutable
timestamps to Invocation records.

The normative words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** have the
same meaning as in the [OCLP Core Specification](https://evanz.github.io/open-computation-lifecycle/protocol/specification/).
Core shared values, JSON rules, canonicalization, and extension rules apply
unless this profile says otherwise.

## 2. Design rationale (non-normative)

| Decision | Rationale and consequence |
| --- | --- |
| Timeline facts remain Events. | An Invocation is an immutable logical request. Submission, execution, retry, and terminal facts happen over time and must be append-only observations rather than mutable Invocation fields. |
| The claim is a first-class Invocation profile binding, not a profile Artifact. | This profile defines Event semantics but has no per-Invocation payload that needs content-addressed storage. Its explicit version binding lets consumers distinguish it from an application that happens to use similar event names. |
| `occurred_at` is the timestamp field. | `created_at` is ambiguous: it could describe the content, an OCLP record, or an execution action. The event type plus Core `occurred_at` states exactly what happened and when. |
| Sequence orders one Invocation's facts. | Clocks can be equal or imperfect across schedulers. Core Event `sequence` establishes the producer's logical order; consumers MUST NOT require wall-clock timestamps to increase strictly. |
| The profile is optional. | Projects that do not claim it remain valid OCLP producers. Generic explorers may show a clearly labeled first/last recorded Event fallback but cannot claim portable request or completion chronology. |

## 3. Profile declaration

| Declaration | Value |
| --- | --- |
| Profile ID | `lifecycle` |
| Profile version | `0.1.0-draft` |
| Core compatibility | OCLP Core `0.1.0-draft` |
| Dependencies | None |
| Extension surfaces | The `profiles.lifecycle` Invocation binding and the Event conventions below |
| Conformance package | This specification, binding/timeline JSON Schemas, and valid/invalid vectors |

## 4. Invocation binding

To claim this profile, a producer MUST put this exact object in an
Invocation's `profiles` object:

```json
{
  "lifecycle": {
    "version": "0.1.0-draft"
  }
}
```

The binding has no Artifact reference because the profile defines no
Invocation-specific payload. An Invocation MAY omit it. A consumer MUST NOT
apply these lifecycle semantics to an Invocation that does not claim it.

The binding is a closed object:

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `version` | required; string | MUST be `"0.1.0-draft"`. The `lifecycle` map key already identifies the profile, so the ID is not repeated. |

## 5. Standard Event conventions

All these Events retain the Core-required `invocation`, `occurred_at`, and
`sequence` fields. Other application Events MAY occur between them; this
profile does not define their `data` objects.

| Event type | Cardinality and required fields | Portable meaning |
| --- | --- | --- |
| `invocation-requested` | Exactly one; MUST have `sequence: 0`; MUST omit `attempt_id` and `status`. | The logical Invocation request was accepted. Its `occurred_at` is `requested_at`. |
| `attempt-started` | Zero or more; each MUST have a unique `attempt_id`, omit `status`, and have a sequence greater than request. | One concrete execution attempt began. The earliest is `started_at`. |
| `invocation-terminal` | Zero or one; MUST include Core `status`; its sequence MUST follow request and every `attempt-started` Event. | The logical Invocation reached its portable terminal state. Its `occurred_at` is `completed_at`. |

An incomplete or still-running Invocation has no `invocation-terminal` Event.
`status` is therefore absent from its profile timeline. A terminal Event MAY
include `attempt_id` when a single attempt caused the terminal result, but the
field is optional because the Event reports the logical Invocation rather than
an attempt-local state.

The profile uses Event sequence for order. Consumers SHOULD display Event
`occurred_at` as the reported time but MUST NOT reject a valid timeline merely
because two times are equal or a distributed clock made them non-monotonic.

## 6. Consumer behavior

A conforming lifecycle-profile consumer MUST validate the Invocation profile
binding
and the event conventions before calling the resulting values
`requested_at`, `started_at`, or `completed_at`. It SHOULD order profile-claiming
runs by `requested_at`, with deterministic ID tiebreaking.

For an Invocation that does not claim the profile, a consumer MAY derive the
earliest and latest associated Core Events for navigation. It MUST label those
values as generic recorded-event observations, not as request or completion
times.

## 7. Example

```json
{
  "binding": {
    "version": "0.1.0-draft"
  },
  "events": [
    {
      "event_type": "invocation-requested",
      "occurred_at": "2026-08-24T18:00:00Z",
      "sequence": 0
    },
    {
      "event_type": "attempt-started",
      "occurred_at": "2026-08-24T18:00:01Z",
      "sequence": 1,
      "attempt_id": "scheduler-42"
    },
    {
      "event_type": "invocation-terminal",
      "occurred_at": "2026-08-24T18:00:04Z",
      "sequence": 2,
      "attempt_id": "scheduler-42",
      "status": "succeeded"
    }
  ]
}
```

## 8. Conformance

A conforming producer that claims this profile MUST emit the exact Invocation
profile binding and satisfy all Event conventions in section 5. A conforming
consumer MUST validate the binding and timeline before relying on its portable
chronology. The published schemas and valid/invalid vectors are conformance
artifacts; this specification is authoritative.

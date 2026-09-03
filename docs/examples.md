# Examples

OCLP is not specific to basketball, machine learning, or software delivery.
These small records use ordinary industry scenarios and are independently valid
against the 0.2 Core schema.

| Scenario | File | Core concept |
| --- | --- | --- |
| Document transformation | [`document-transformation-artifact.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/document-transformation-artifact.json) | Immutable source bytes and retrieval hints. |
| Model inference | [`model-inference-execution.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/model-inference-execution.json) | A concrete run with exact model/data inputs and score output. |
| Software build | [`software-build-computation.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/software-build-computation.json) | A reusable build implementation with typed ports and a Git source basis. |
| Data quality | [`data-quality-evidence.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/data-quality-evidence.json) | A source-bound evaluator result about a dataset artifact. |
| Inference failure | [`model-inference-failed-event.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/model-inference-failed-event.json) | A terminal execution observation with a portable diagnostic. |

## Artifact: a retrievable immutable value

An Artifact describes immutable bytes. Its digest identifies content; locations
are replaceable retrieval hints. `created_at` is optional and means the
producer knows when it created that immutable materialization—not the age of a
source file or an upload timestamp.

```json
{
  "kind": "artifact",
  "id": "urn:example:artifact:employee-handbook",
  "digest": {"algorithm": "sha256", "value": "6dfad2b5…f5f47e31"},
  "locations": ["https://storage.example.org/documents/handbook-v3.txt"]
}
```

## Computation: reusable declared work

A Computation names the reusable work and binds it to a source basis. It has no
run-specific data. The build example uses a command locator and an exact Git
revision. It can also declare the exact Evidence evaluator a successful build must satisfy:

```json
{
  "kind": "computation",
  "id": "urn:example:computation:service-container-build",
  "implementation": {
    "kind": "command",
    "locator": "docker buildx build --file service/Dockerfile",
    "source": {"kind": "git", "repository": "…/service.git", "commit": "012345…4567"}
  },
  "required_evidence": [
    {
      "kind": "command",
      "locator": "scripts/container-smoke-test",
      "source": {"kind": "git", "repository": "…/service.git", "commit": "012345…4567"}
    }
  ]
}
```

## Execution: one actual run

An Execution binds one Computation to concrete parameters, inputs, and outputs.
It is the data-DAG boundary: Artifact or ArtifactSet → Execution → Artifact or
ArtifactSet. A retry is another Execution; OCLP does not introduce a second
Attempt identity beneath it.

```json
{
  "kind": "execution",
  "id": "urn:example:execution:fraud-score-batch-2026-08-19",
  "computation": {"id": "urn:example:computation:fraud-score-v4", "digest": {"algorithm": "sha256", "value": "111111…1111"}},
  "inputs": {"model": [{"id": "urn:example:artifact-set:fraud-model-v4"}]},
  "outputs": {"scores": [{"id": "urn:example:artifact:fraud-scores-2026-08-19"}]}
}
```

## Evidence and Events: assertions and chronology

Evidence records the result of one exact evaluator about an Artifact, Execution,
or another record. An Event observes one Execution. The optional lifecycle profile
standardizes an `execution-started` Event followed by an optional
`execution-terminal` Event with its status. An application may also publish
its own event types and data.

When a Computation declares `required_evidence`, a terminal Event may claim
`"succeeded"` only after matching Evidence content-binds that exact Execution,
names each required evaluator, and has `outcome: "pass"`. This distinguishes “the
runtime completed” from “the declared quality or release gate passed.”

```json
{
  "kind": "event",
  "event_type": "execution-terminal",
  "execution": {"id": "urn:example:execution:fraud-score-batch-2026-08-19"},
  "status": "failed",
  "diagnostic": {"code": "model-endpoint-unavailable", "stage": "invoke"}
}
```

Examples deliberately focus on one record kind. For a complete connected
lineage and executable canonicalization tests, see the
[cross-language conformance](protocol/conformance.md) fixtures.

# Examples

OCLP is not specific to basketball, machine learning, or software delivery.
These small records use ordinary industry scenarios and are independently valid
against the 0.3 Core schema.

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
  "id": "4e890e52-cb6f-5b48-afca-833ca29e5d0a",
  "name": "Employee handbook",
  "description": "Approved employee handbook used as the source document for onboarding.",
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
  "id": "d654b04c-63f4-5b43-9ca2-a39ea776ae44",
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
  "id": "23d5a1d7-d167-5473-9e4c-9fd305f3ee34",
  "computation": {"id": "991ec7eb-b824-500c-8e19-0b7e0f4a9066"},
  "inputs": {"model": [{"id": "4e890e52-cb6f-5b48-afca-833ca29e5d0a"}]},
  "outputs": {"scores": [{"id": "3c91d6b3-9902-587a-9641-4d6f84cad2f4"}]}
}
```

## Evidence and Events: assertions and chronology

Evidence records the result of one exact evaluator about an Artifact, Execution,
or another record. An Event observes one Execution. The optional lifecycle profile
standardizes an `execution-started` Event followed by an optional
`execution-terminal` Event with its status. An application may also publish
its own event types and data.

When a Computation declares `required_evidence`, a terminal Event may claim
`"succeeded"` only after matching Evidence references that exact Execution,
names each required evaluator, and has `outcome: "pass"`. This distinguishes “the
runtime completed” from “the declared quality or release gate passed.”

```json
{
  "kind": "event",
  "event_type": "execution-terminal",
  "execution": {"id": "23d5a1d7-d167-5473-9e4c-9fd305f3ee34"},
  "status": "failed",
  "diagnostic": {"code": "model-endpoint-unavailable", "stage": "invoke"}
}
```

Examples deliberately focus on one record kind. For a complete connected
lineage and executable canonicalization tests, see the
[cross-language conformance](protocol/conformance.md) fixtures.

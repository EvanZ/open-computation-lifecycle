# Examples

OCLP is not specific to basketball, machine learning, or software delivery. The
repository includes four small, independently valid records that illustrate
common uses:

| Scenario | File | Core concept |
| --- | --- | --- |
| Document transformation | [`document-transformation-artifact.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/document-transformation-artifact.json) | Immutable source bytes and retrieval hints. |
| Model inference | [`model-inference-invocation.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/model-inference-invocation.json) | Exact model/data bindings and inference parameters. |
| Software build | [`software-build-definition.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/software-build-definition.json) | A command implementation with typed input and output ports. |
| Data quality | [`data-quality-evidence.json`](https://github.com/EvanZ/open-computation-lifecycle/blob/main/examples/data-quality-evidence.json) | A named contract evaluated against a dataset artifact. |

Validate an example locally:

```bash
uv run oclp validate examples/document-transformation-artifact.json
```

## Document transformation

An Artifact identifies immutable source bytes. Its location is only a retrieval
hint; the SHA-256 digest is the content identity.

```json
{
  "oclp_version": "0.1.0-draft",
  "kind": "artifact",
  "id": "urn:sha256:6dfad2b52801af0f3b1d6d6a5169d678b6b9606f8d510d2cd7ca0a82f5f47e31",
  "annotations": {
    "example.org/role": "source-document"
  },
  "media_type": "text/plain",
  "digest": {
    "algorithm": "sha256",
    "value": "6dfad2b52801af0f3b1d6d6a5169d678b6b9606f8d510d2cd7ca0a82f5f47e31"
  },
  "size": 348,
  "locations": [
    "https://storage.example.org/documents/handbook-v3.txt"
  ]
}
```

## Model inference

An Invocation binds a model and transaction batch to the exact parameters and
outputs requested for an inference run.

```json
{
  "oclp_version": "0.1.0-draft",
  "kind": "invocation",
  "id": "urn:example:invocation:fraud-score-batch-2026-08-19",
  "annotations": {
    "example.org/purpose": "batch-inference"
  },
  "definition": {
    "id": "urn:example:definition:fraud-score-v4"
  },
  "parameters": {
    "decision_threshold": 0.82,
    "explanation": true
  },
  "inputs": {
    "transactions": [
      {
        "id": "urn:sha256:09a43e5f3ceaaea12f36a22ff8fe264a4f9fe6dbf44ff73d337e8b2bfeadff07"
      }
    ],
    "model": [
      {
        "id": "urn:sha256:44ecef9ea7b8db964eb9da498d4574fdc079ebf050252c6e0e14ca4a89d4a1cd"
      }
    ]
  },
  "requested_outputs": [
    "scores",
    "explanations"
  ]
}
```

## Software build

A Definition describes an executable build implementation and its typed ports,
without selecting a scheduler or build service.

```json
{
  "oclp_version": "0.1.0-draft",
  "kind": "definition",
  "id": "urn:example:definition:service-container-build",
  "annotations": {
    "example.org/purpose": "software-build"
  },
  "implementation": {
    "kind": "command",
    "locator": "buildctl build --frontend dockerfile.v0",
    "digest": {
      "algorithm": "sha256",
      "value": "87b6c72b5098c78187360864246f421850073e95f934ce17873b4f080d30bb28"
    }
  },
  "input_ports": [
    {
      "name": "source",
      "cardinality": "one",
      "required": true,
      "media_types": [
        "application/vnd.git.bundle"
      ]
    },
    {
      "name": "lockfile",
      "cardinality": "one",
      "required": true,
      "media_types": [
        "application/json"
      ]
    }
  ],
  "output_ports": [
    {
      "name": "container-image",
      "cardinality": "one",
      "required": true,
      "media_types": [
        "application/vnd.oci.image.manifest.v1+json"
      ]
    }
  ]
}
```

## Data quality

Evidence records a named contract result against an immutable dataset Artifact.

```json
{
  "oclp_version": "0.1.0-draft",
  "kind": "evidence",
  "id": "urn:example:evidence:customer-export-null-check",
  "annotations": {
    "example.org/purpose": "data-quality"
  },
  "subject": {
    "id": "urn:sha256:5fb7c21a9cb66c2fb03f129afe1b0e2ee6d6495e1f4703570f792f20403fdd7d"
  },
  "contract": {
    "id": "urn:example:contract:required-customer-identifiers",
    "version": "2"
  },
  "outcome": "pass",
  "observed_at": "2026-08-19T20:00:00Z",
  "details": {
    "columns_checked": [
      "customer_id",
      "email"
    ],
    "null_rows": 0,
    "rows_checked": 125000
  }
}
```

Examples deliberately focus on one record kind. For a complete, connected
lineage across the core record kinds, see the
[cross-language conformance](protocol/conformance.md) fixtures.

## Release package

An ArtifactSet expresses a release package without prescribing whether its
members are stored in a directory, an archive, or an object-store prefix. Each
member name is unique, and the Artifact reference is content-bound with its
record digest.

```json
{
  "oclp_version": "0.1.0-draft",
  "kind": "artifact_set",
  "id": "urn:example:artifact-set:release",
  "annotations": {"example.org/purpose": "release-package"},
  "members": [
    {
      "name": "source-document",
      "artifact": {
        "id": "urn:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "digest": {
          "algorithm": "sha256",
          "value": "2c7a438a16eee01e8403cefea2644319e37237039504ae8b2fada4424097cd3d"
        }
      },
      "role": "source-document",
      "required": true
    }
  ]
}
```

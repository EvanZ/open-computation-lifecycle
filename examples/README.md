# OCLP examples

Each file is an independently valid draft-0.1 record that uses a generic
industry scenario. Validate one with `uv run oclp validate <path>`.

| Example | Primary record | What it illustrates |
| --- | --- | --- |
| `document-transformation-artifact.json` | Artifact | Immutable source document content and replaceable retrieval locations. |
| `model-inference-invocation.json` | Invocation | Exact model/data bindings, parameters, and requested inference outputs. |
| `software-build-definition.json` | Definition | A build implementation with typed source and lockfile ports. |
| `data-quality-evidence.json` | Evidence | A named quality contract evaluated against a dataset artifact. |

For a connected lineage across the core record kinds, use the language-neutral
[`tests/conformance/`](../tests/conformance/) fixture corpus.

# OCLP examples

Each file is an independently valid draft-0.2 record that uses a generic
industry scenario. Validate one with `uv run oclp validate <path>`.

| Example | Primary record | What it illustrates |
| --- | --- | --- |
| `document-transformation-artifact.json` | Artifact | Immutable source document content and replaceable retrieval locations. |
| `model-inference-execution.json` | Execution | Exact model/data bindings, parameters, and requested inference outputs. |
| `software-build-computation.json` | Computation | A build implementation with typed source and lockfile ports. |
| `data-quality-evidence.json` | Evidence | An exact source-bound quality evaluator result for a dataset artifact. |
| `model-inference-failed-event.json` | Event | A terminal execution state with a portable diagnostic. |

For a connected lineage across the core record kinds, use the language-neutral
[`tests/conformance/`](../tests/conformance/) fixture corpus.

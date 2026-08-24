# Execution Context Profile Specification

Status: Experimental profile for OCLP Core `0.1.0-draft`.

## 1. Purpose

The execution-context profile describes the portable runtime and configuration
facts needed to interpret or reproduce one Invocation. It does not prescribe a
runtime manager, container format, dependency resolver, secret manager, or
workflow system. It complements an Implementation's source basis: the
Definition identifies the selected computation, while this profile identifies
the runtime and effective configuration used to request it.

The normative words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** have the
same meaning as in the [OCLP Core Specification](https://evanz.github.io/open-computation-lifecycle/protocol/specification/).
Core shared values, JSON rules, canonicalization, and extension rules apply
unless this profile says otherwise.

## 2. Design rationale (non-normative)

| Decision | Rationale and consequence |
| --- | --- |
| Runtime facts are a profile Artifact, not Invocation parameters. | Parameters describe caller-controlled behavior. Interpreter, platform, and dependency resolution describe the execution context and would make otherwise identical requests look semantically different. |
| The effective configuration is an optional Artifact reference. | Gitignored YAML is often material to a run but should not be treated as source code. Capturing normalized, redacted effective configuration gives it an integrity boundary without copying every noisy authoring file. |
| Git source overlays remain on `GitSource`. | Uncommitted code changes alter the Definition selected. A Git commit plus a bound ArtifactSet overlay makes that distinction durable; the profile need not duplicate it. |
| Secrets are references or redactions, never profile content. | A provenance record must be safe to retain and share. A producer can identify a secret reference in configuration annotations without storing its resolved value. |

## 3. Profile declaration

| Declaration | Value |
| --- | --- |
| Profile ID | `execution-context` |
| Profile version | `0.1.0-draft` |
| Core compatibility | OCLP Core `0.1.0-draft` |
| Dependencies | None |
| Extension surfaces | Canonical Artifact content and the `oclp.dev/execution-context` Invocation annotation |
| Required Artifact media type | `application/vnd.oclp.execution-context+json` |
| Required Artifact schema URI | `urn:oclp:profile:execution-context:0.1.0-draft` |
| Conformance package | This specification, the published JSON Schema, and valid/invalid vectors |

## 4. Transport and Invocation binding

The profile is canonical JSON carried by an ordinary core Artifact. A producer
MUST set its `media_type` to `application/vnd.oclp.execution-context+json` and
its `schema_uri` to `urn:oclp:profile:execution-context:0.1.0-draft`. The
Artifact's SHA-256 identifies the exact context manifest.

To bind the profile to an Invocation, a producer MUST place this object in the
Invocation's `annotations`:

```json
{
  "oclp.dev/execution-context": {
    "profile": {
      "id": "urn:example:artifact:execution-context",
      "digest": {
        "algorithm": "sha256",
        "value": "8b5fc8f8505c245a8b1da4fd1af090ce69d444aea1a81ab7ed96b8f5b742c7ac"
      }
    }
  }
}
```

`profile` MUST include a record digest and resolve to the profile Artifact.
This binding is a reference overlay, not a derivation edge. An Invocation MAY
omit the annotation when the producer does not claim this profile.

## 5. Manifest fields

The manifest is a closed JSON object. Its canonical form is JCS canonical JSON
after applying defaults.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `oclp_profile` | default; string | MUST be `"execution-context"`. |
| `oclp_profile_version` | default; string | MUST be `"0.1.0-draft"`. |
| `runtime` | required; ExecutionRuntime | The portable runtime identity used for the Invocation. |
| `configuration` | optional; RecordReference | An Artifact containing the effective, redacted configuration used for this Invocation. Its record digest is REQUIRED. Omit it when no durable configuration snapshot is available. |
| `annotations` | default; object | Empty object by default. Producer-defined non-secret metadata, such as a scheduler deployment ID or a reference to a secret name. |

### 5.1 ExecutionRuntime

`runtime` is a closed object:

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `interpreter` | required; string | Non-empty runtime identifier and version, for example `"CPython 3.12.11"` or `"OpenJDK 21.0.6"`. |
| `platform` | required; string | Non-empty producer-declared platform identity, for example `"macOS-15.6-arm64"` or `"linux/amd64"`. |
| `dependency_lock` | required; RecordReference | Artifact containing the exact dependency lock or other bounded resolver output. Its record digest is REQUIRED. |

The dependency-lock Artifact is an input to reproducibility, not necessarily a
data-derivation input. Its content can be a lockfile, image manifest, package
resolution report, or another immutable resolver result. A producer MUST NOT
put plaintext credentials in it.

## 6. Configuration and source-state rules

A producer SHOULD capture the effective configuration after include, merge,
and default resolution. It MAY retain an authoring YAML file separately, but
the profile's `configuration` reference SHOULD identify the configuration that
actually governed execution. A producer MUST redact resolved secrets; a stable
secret reference, version label, or provider path MAY appear in annotations if
safe for that environment.

When the Definition uses a Git source, a clean worktree is represented by an
absent `GitSource.overlay`. A dirty worktree that changes the selected
implementation MUST publish an ArtifactSet overlay and bind it to
`GitSource.overlay`. The overlay SHOULD contain a binary Git patch for tracked
changes and MAY contain explicitly selected untracked source files. It MUST NOT
silently absorb ignored/generated files or secrets. The attempt-started Event
MAY additionally report the execution-local checkout path and dirty state.

## 7. Example

```json
{
  "oclp_profile": "execution-context",
  "oclp_profile_version": "0.1.0-draft",
  "runtime": {
    "interpreter": "CPython 3.12.11",
    "platform": "macOS-15.6-arm64",
    "dependency_lock": {
      "id": "urn:example:artifact:uv-lock",
      "digest": {
        "algorithm": "sha256",
        "value": "5653028d1c84c7c401aa136410f1e42e7db54f8bb68000aa2c1c32284ae58c54"
      }
    }
  },
  "configuration": {
    "id": "urn:example:artifact:dagster-effective-run-config",
    "digest": {
      "algorithm": "sha256",
      "value": "72fc66c40a5c847064b528260419301cdc4a8d8b1b9c2138224ec278a2b4a1b9"
    }
  },
  "annotations": {
    "example.org/scheduler": "dagster"
  }
}
```

## 8. Conformance

A conforming producer MUST emit a manifest that validates against the published
execution-context JSON Schema and satisfies this specification. A consumer that
claims this profile MUST also validate the Invocation annotation binding,
resolve its profile reference to an Artifact, and reproduce the published
canonical JSON and digest vectors.

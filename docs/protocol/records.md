# Core records

Every OCLP record has an `id`, `kind`, and `oclp_version`. Draft 0.1 defines
six record kinds.

| Record | Purpose |
| --- | --- |
| Definition | Names a computation, its implementation, and input/output ports. |
| Invocation | Binds one Definition to exact input-artifact references and parameters. |
| Artifact | Describes immutable bytes by media type, size, and SHA-256 digest. |
| ArtifactSet | Names exact Artifacts in one immutable logical collection. |
| Evidence | Records a named contract evaluation against another record. |
| Event | Records an ordered lifecycle fact about an invocation or attempt. |

## References and ports

References carry a logical record ID and may include a record digest. When a
digest is present, a consumer must reject a mismatch. Definitions declare named
ports; invocations use those names to bind input artifacts and requested
outputs. Port names are unique within each direction.

An ArtifactSet member has a unique name, optional role, required flag, and an
Artifact reference with a record digest. It is a logical collection, not a
prescribed archive or directory layout.

An Implementation may also carry an exact Artifact reference for its code or
runtime package. This does not create a special code record type: source
bundles, wheels, and container manifests are ordinary Artifacts.

## Extensions

Top-level fields are strict in draft 0.1. Producers place experimental or
domain-specific information under namespaced `annotations` fields rather than
changing the core shape.

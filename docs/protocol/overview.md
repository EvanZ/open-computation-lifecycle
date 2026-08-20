# Protocol overview

OCLP records a computation boundary without prescribing how that computation is
scheduled or implemented. A producer first identifies a reusable computation,
then creates an invocation binding it to concrete inputs and parameters.
Artifacts, evidence, and lifecycle events make that request inspectable after
the fact.

## Core record map

OCLP's six record kinds form a compact vocabulary:

| Record | Purpose |
| --- | --- |
| Definition | Names a computation, its implementation, and input/output ports. |
| Invocation | Binds one Definition to input references and parameters. |
| Artifact | Describes immutable bytes by media type, size, and SHA-256 digest. |
| ArtifactSet | Names exact Artifacts in one immutable logical collection. |
| Evidence | Records a versioned contract evaluation against another record. |
| Event | Records an ordered lifecycle fact about an invocation or attempt. |

References use logical IDs and can carry record digests to bind an exact record.
An implementation can also bind an ordinary Artifact for its source bundle,
wheel, or container manifest—there is no separate code-record kind.

## What OCLP answers

For a produced file or dataset, a consumer should be able to answer:

1. Which immutable input artifacts were used?
2. Which computation definition and implementation were selected?
3. Which exact code or runtime package was bound, when the producer records it?
4. What exact parameters were bound?
5. Which execution attempt produced the durable facts?
6. What evidence was recorded about the result?

## What it intentionally leaves out

OCLP does not select retries, schedule work, store artifact bytes, define
domain quality metrics, or make a computation reproducible by itself. It
describes those existing facts in a portable form.

The [normative specification](specification.md) defines every field, type,
default, constraint, and invariant for this first version.

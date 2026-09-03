# Protocol overview

OCLP records a computation boundary without prescribing how that computation is
scheduled or implemented. A producer first identifies a reusable Computation,
then records an Execution binding it to concrete inputs, parameters, and
durable outputs when they are published.
Artifacts, evidence, and lifecycle events make that execution inspectable after
the fact.

Execution status belongs to a terminal Event, while an evaluator result belongs
to Evidence. Both record kinds can carry the same optional portable Diagnostic
(code, concise message, stage, and an optional detailed-log Artifact reference)
without forcing consumers to interpret producer-specific JSON detail fields.
A Computation may additionally declare exact source-bound Evidence evaluators that must
pass before one of its Executions can claim success.

## Core record map

OCLP's six record kinds form a compact vocabulary:

| Record | Purpose |
| --- | --- |
| Computation | Names a reusable computation, its implementation, input/output ports, JSON-valued parameter definitions, and optional Evidence evaluators required for success. |
| Execution | Binds one Computation to exact inputs, parameters, and direct outputs. Each retry or rerun is a distinct Execution. |
| Artifact | Describes immutable bytes by media type, size, and SHA-256 digest. |
| ArtifactSet | Names exact Artifacts in one immutable logical collection. |
| Evidence | Records one source-bound evaluator result about another record. |
| Event | Records an ordered lifecycle fact about an Execution. |

References use logical IDs and can carry record digests to bind an exact record.
Records may also carry an optional human-readable `name`. Generic interfaces
may display that name, but IDs remain the only portable lookup and reference
mechanism.
Every implementation declares its source basis: a Git repository and immutable
commit, an Artifact, a versioned service, or an explicit opaque reason. A
machine-specific worktree and dirty state are Execution Event context, not
Computation data.

## What OCLP answers

For a produced file or dataset, a consumer should be able to answer:

1. Which immutable input artifacts were used?
2. Which Computation and implementation were selected?
3. Which exact code or runtime package was bound, when the producer records it?
4. What exact parameters were bound?
5. Which exact durable Artifacts did the Execution produce?
6. Which exact Execution produced the durable facts?
7. What evidence was recorded about the result?
8. Did the Execution satisfy every required Evidence evaluator?

## What it intentionally leaves out

OCLP does not select retries, schedule work, store artifact bytes, define
domain quality metrics, or make a computation reproducible by itself. It
describes those existing facts in a portable form.

The [normative specification](specification.md) defines every field, type,
default, constraint, and invariant for this first version.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import path from "node:path";

import { Ajv2020 } from "ajv/dist/2020.js";

type ManifestEntry = {
  path: string;
  canonical_json: string;
  digest: string;
};

type Manifest = {
  valid: ManifestEntry[];
  invalid: string[];
  lineage: Record<string, string>;
};

type ProfileManifest = {
  valid: ManifestEntry[];
  invalid: string[];
};

type OclpRecord = Record<string, any>;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtures = path.join(root, "tests/conformance");
const datasetFixtures = path.join(root, "tests/profiles/dataset-snapshot");
const require = createRequire(import.meta.url);
const canonicalize = require("canonicalize") as (
  input: unknown,
) => string | undefined;
const addFormats = require("ajv-formats") as (instance: Ajv2020) => void;
const coreSchema = JSON.parse(
  await readFile(path.join(root, "schemas/oclp-record.schema.json"), "utf8"),
);
const manifest = JSON.parse(
  await readFile(path.join(fixtures, "manifest.json"), "utf8"),
) as Manifest;
const datasetSchema = JSON.parse(
  await readFile(path.join(root, "profiles/dataset-snapshot.schema.json"), "utf8"),
);
const executionFixtures = path.join(root, "tests/profiles/execution-context");
const lifecycleFixtures = path.join(root, "tests/profiles/lifecycle");
const executionSchema = JSON.parse(
  await readFile(path.join(root, "profiles/execution-context.schema.json"), "utf8"),
);
const executionBindingSchema = JSON.parse(
  await readFile(
    path.join(root, "profiles/execution-context-binding.schema.json"),
    "utf8",
  ),
);
const lifecycleBindingSchema = JSON.parse(
  await readFile(path.join(root, "profiles/lifecycle-binding.schema.json"), "utf8"),
);
const lifecycleTimelineSchema = JSON.parse(
  await readFile(path.join(root, "profiles/lifecycle-timeline.schema.json"), "utf8"),
);
const datasetManifest = JSON.parse(
  await readFile(path.join(datasetFixtures, "manifest.json"), "utf8"),
) as ProfileManifest;
const executionManifest = JSON.parse(
  await readFile(path.join(executionFixtures, "manifest.json"), "utf8"),
) as ProfileManifest;
const lifecycleManifest = JSON.parse(
  await readFile(path.join(lifecycleFixtures, "manifest.json"), "utf8"),
) as ProfileManifest;
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(coreSchema);
const validateDatasetSnapshot = ajv.compile(datasetSchema);
const validateExecutionContext = ajv.compile(executionSchema);
const validateExecutionContextBinding = ajv.compile(executionBindingSchema);
const validateLifecycleBinding = ajv.compile(lifecycleBindingSchema);
const validateLifecycleTimeline = ajv.compile(lifecycleTimelineSchema);

const records = new Map<string, OclpRecord>();
const recordsByDigest = new Map<string, OclpRecord>();
for (const entry of manifest.valid) {
  const record = JSON.parse(
    await readFile(path.join(fixtures, entry.path), "utf8"),
  ) as OclpRecord;
  assert.equal(validate(record), true, validate.errors?.map(String).join("\n"));
  assert.equal(semanticRulesHold(record), true, entry.path);
  const canonical = canonicalize(record);
  assert.notEqual(canonical, undefined);
  assert.equal(canonical, entry.canonical_json, entry.path);
  const digest = createHash("sha256").update(canonical).digest("hex");
  assert.equal(`sha256:${digest}`, entry.digest, entry.path);
  records.set(String(record.id), record);
  recordsByDigest.set(entry.digest.replace(/^sha256:/, ""), record);
}

assert.equal(derivationGraphRulesHold(recordsByDigest), true);
assert.equal(invocationHierarchyRulesHold(records, recordsByDigest), true);

for (const fixturePath of manifest.invalid) {
  const record = JSON.parse(
    await readFile(path.join(fixtures, fixturePath), "utf8"),
  ) as OclpRecord;
  assert.equal(
    validate(record) && semanticRulesHold(record),
    false,
    `${fixturePath} unexpectedly validated`,
  );
}

for (const entry of datasetManifest.valid) {
  const snapshot = JSON.parse(
    await readFile(path.join(datasetFixtures, entry.path), "utf8"),
  ) as OclpRecord;
  assert.equal(
    validateDatasetSnapshot(snapshot),
    true,
    validateDatasetSnapshot.errors?.map(String).join("\n"),
  );
  assert.equal(datasetSnapshotRulesHold(snapshot), true, entry.path);
  const canonical = canonicalize(snapshot);
  assert.notEqual(canonical, undefined);
  assert.equal(canonical, entry.canonical_json, entry.path);
  const digest = createHash("sha256").update(canonical).digest("hex");
  assert.equal(`sha256:${digest}`, entry.digest, entry.path);
}

for (const fixturePath of datasetManifest.invalid) {
  const snapshot = JSON.parse(
    await readFile(path.join(datasetFixtures, fixturePath), "utf8"),
  ) as OclpRecord;
  assert.equal(
    validateDatasetSnapshot(snapshot) && datasetSnapshotRulesHold(snapshot),
    false,
    `${fixturePath} unexpectedly validated`,
  );
}

for (const entry of executionManifest.valid) {
  const profile = JSON.parse(
    await readFile(path.join(executionFixtures, entry.path), "utf8"),
  ) as OclpRecord;
  assert.equal(
    validateExecutionContext(profile),
    true,
    validateExecutionContext.errors?.map(String).join("\n"),
  );
  assert.equal(executionContextRulesHold(profile), true, entry.path);
  const canonical = canonicalize(profile);
  assert.notEqual(canonical, undefined);
  assert.equal(canonical, entry.canonical_json, entry.path);
  const digest = createHash("sha256").update(canonical).digest("hex");
  assert.equal(`sha256:${digest}`, entry.digest, entry.path);
}

for (const fixturePath of executionManifest.invalid) {
  const profile = JSON.parse(
    await readFile(path.join(executionFixtures, fixturePath), "utf8"),
  ) as OclpRecord;
  assert.equal(
    validateExecutionContext(profile) && executionContextRulesHold(profile),
    false,
    `${fixturePath} unexpectedly validated`,
  );
}

for (const binding of [
  {
    version: "0.1.0-draft",
    manifest: {
      id: "urn:example:artifact:execution-context",
      digest: { algorithm: "sha256", value: "a".repeat(64) },
    },
  },
]) {
  assert.equal(
    validateExecutionContextBinding(binding),
    true,
    validateExecutionContextBinding.errors?.map(String).join("\n"),
  );
}
assert.equal(validateExecutionContextBinding({
  manifest: {
    id: "urn:example:artifact:execution-context",
    digest: { algorithm: "sha256", value: "a".repeat(64) },
  },
}), false);

for (const entry of lifecycleManifest.valid) {
  const timeline = JSON.parse(
    await readFile(path.join(lifecycleFixtures, entry.path), "utf8"),
  ) as OclpRecord;
  assert.equal(
    validateLifecycleTimeline(timeline),
    true,
    validateLifecycleTimeline.errors?.map(String).join("\n"),
  );
  assert.equal(
    validateLifecycleBinding(timeline.binding),
    true,
    validateLifecycleBinding.errors?.map(String).join("\n"),
  );
  assert.equal(lifecycleRulesHold(timeline), true, entry.path);
  const canonical = canonicalize(timeline);
  assert.notEqual(canonical, undefined);
  assert.equal(canonical, entry.canonical_json, entry.path);
  const digest = createHash("sha256").update(canonical).digest("hex");
  assert.equal(`sha256:${digest}`, entry.digest, entry.path);
}

for (const fixturePath of lifecycleManifest.invalid) {
  const timeline = JSON.parse(
    await readFile(path.join(lifecycleFixtures, fixturePath), "utf8"),
  ) as OclpRecord;
  assert.equal(
    validateLifecycleTimeline(timeline) && lifecycleRulesHold(timeline),
    false,
    `${fixturePath} unexpectedly validated`,
  );
}

const invocation = records.get(manifest.lineage.invocation_id)!;
assert.equal(invocation.definition?.id, manifest.lineage.definition_id);
assert.equal(invocation.inputs?.source?.[0]?.id, manifest.lineage.input_artifact_id);
assert.equal(invocation.outputs?.result?.[0]?.id, manifest.lineage.output_artifact_id);
assert.equal(
  records.get(manifest.lineage.evidence_id)?.subject?.id,
  manifest.lineage.invocation_id,
);
assert.equal(
  records.get(manifest.lineage.event_id)?.invocation?.id,
  manifest.lineage.invocation_id,
);

console.log(
  `Verified ${manifest.valid.length} valid and ${manifest.invalid.length} invalid ` +
    `OCLP fixtures; ${datasetManifest.valid.length} valid and ` +
    `${datasetManifest.invalid.length} invalid dataset-snapshot fixtures; ` +
    `${executionManifest.valid.length} valid and ${executionManifest.invalid.length} ` +
    `invalid execution-context fixtures; ${lifecycleManifest.valid.length} valid and ` +
    `${lifecycleManifest.invalid.length} invalid lifecycle fixtures.`,
);

function semanticRulesHold(record: OclpRecord): boolean {
  if (
    record.profiles &&
    (typeof record.profiles !== "object" ||
      Array.isArray(record.profiles) ||
      Object.keys(record.profiles).length === 0 ||
      Object.entries(record.profiles).some(
        ([profileId, binding]) =>
          !profileId ||
          typeof binding !== "object" ||
          binding === null ||
          Array.isArray(binding),
      ))
  ) {
    return false;
  }

  if (record.kind === "artifact") {
    const digest = record.digest;
    if (
      digest &&
      record.id === `urn:${digest.algorithm ?? "sha256"}:${digest.value}`
    ) {
      return false;
    }
  }

  if (record.kind === "definition") {
    for (const ports of [record.input_ports ?? [], record.output_ports ?? []]) {
      const names = ports.map((port: { name: string }) => port.name);
      if (names.length !== new Set(names).size) {
        return false;
      }
    }
    if (record.implementation?.artifact && !record.implementation.artifact.digest) {
      return false;
    }
    if (
      record.implementation?.source?.kind === "artifact" &&
      !record.implementation.source.artifact?.digest
    ) {
      return false;
    }
    if (
      record.implementation?.source?.kind === "git" &&
      record.implementation.source.overlay &&
      !record.implementation.source.overlay.digest
    ) {
      return false;
    }
  }

  if (record.kind === "artifact_set") {
    const names = (record.members ?? []).map((member: { name: string }) => member.name);
    if (names.length !== new Set(names).size) {
      return false;
    }
    if ((record.members ?? []).some((member: { artifact?: { digest?: unknown } }) => !member.artifact?.digest)) {
      return false;
    }
  }

  if (record.kind === "invocation") {
    if (
      Object.values(record.outputs ?? {}).some((references: unknown) =>
        !(references as Array<{ digest?: unknown }>).every(
          (reference) => Boolean(reference.digest),
        ),
      )
    ) {
      return false;
    }
  }

  if (record.kind === "event" || record.kind === "evidence") {
    const diagnostic = record.diagnostic;
    if (diagnostic) {
      if (
        !diagnostic.code &&
        !diagnostic.message &&
        !diagnostic.stage &&
        !diagnostic.artifact
      ) {
        return false;
      }
      if (diagnostic.artifact && !diagnostic.artifact.digest) {
        return false;
      }
    }
  }

  return true;
}

function derivationGraphRulesHold(recordsByDigest: Map<string, OclpRecord>): boolean {
  const adjacency = new Map<string, Set<string>>();

  const resolve = (
    reference: { id?: unknown; digest?: { value?: unknown } },
    expectedKind: string,
  ): string | undefined => {
    const digest = reference.digest?.value;
    if (typeof digest !== "string") return undefined;
    const target = recordsByDigest.get(digest);
    if (!target || target.kind !== expectedKind || target.id !== reference.id) {
      return undefined;
    }
    return digest;
  };

  for (const record of recordsByDigest.values()) {
    if (record.kind !== "definition") continue;
    const overlay = record.implementation?.source?.kind === "git"
      ? record.implementation.source.overlay
      : undefined;
    if (overlay && !resolve(overlay, "artifact_set")) return false;
  }

  for (const [invocationDigest, record] of recordsByDigest) {
    if (record.kind !== "invocation") continue;
    if (!resolve(record.definition ?? {}, "definition")) return false;
    for (const references of Object.values(record.inputs ?? {})) {
      for (const reference of references as Array<{ id?: unknown; digest?: { value?: unknown } }>) {
        const inputDigest = resolve(reference, "artifact");
        if (!inputDigest) return false;
        addEdge(adjacency, inputDigest, invocationDigest);
      }
    }
    for (const references of Object.values(record.outputs ?? {})) {
      for (const reference of references as Array<{ id?: unknown; digest?: { value?: unknown } }>) {
        const outputDigest = resolve(reference, "artifact");
        if (!outputDigest) return false;
        addEdge(adjacency, invocationDigest, outputDigest);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return false;
    if (visited.has(node)) return true;
    visiting.add(node);
    for (const neighbor of adjacency.get(node) ?? []) {
      if (!visit(neighbor)) return false;
    }
    visiting.delete(node);
    visited.add(node);
    return true;
  };
  return [...adjacency.keys()].every(visit);
}

function invocationHierarchyRulesHold(
  recordsById: Map<string, OclpRecord>,
  recordsByDigest: Map<string, OclpRecord>,
): boolean {
  const parents = new Map<string, string>();
  for (const record of recordsByDigest.values()) {
    if (record.kind !== "invocation" || !record.parent_invocation) continue;
    const reference = record.parent_invocation as {
      id?: unknown;
      digest?: { value?: unknown };
    };
    const parent = typeof reference.digest?.value === "string"
      ? recordsByDigest.get(reference.digest.value)
      : typeof reference.id === "string"
        ? recordsById.get(reference.id)
        : undefined;
    if (!parent || parent.kind !== "invocation" || parent.id !== reference.id) {
      return false;
    }
    parents.set(String(record.id), String(parent.id));
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    const parent = parents.get(id);
    if (parent && !visit(parent)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  return [...parents.keys()].every(visit);
}

function addEdge(adjacency: Map<string, Set<string>>, source: string, target: string): void {
  const targets = adjacency.get(source) ?? new Set<string>();
  targets.add(target);
  adjacency.set(source, targets);
}

function datasetSnapshotRulesHold(snapshot: OclpRecord): boolean {
  const partitions = snapshot.partitions ?? [];
  const names = partitions.map((partition: { name: string }) => partition.name);
  if (names.length !== new Set(names).size) {
    return false;
  }
  if (names.join("\0") !== [...names].sort().join("\0")) {
    return false;
  }
  if (
    partitions.some(
      (partition: { artifact?: { digest?: unknown } }) => !partition.artifact?.digest,
    )
  ) {
    return false;
  }
  return !snapshot.parent || Boolean(snapshot.parent.digest);
}

function executionContextRulesHold(profile: OclpRecord): boolean {
  if (!profile.runtime?.dependency_lock?.digest) return false;
  return !profile.configuration || Boolean(profile.configuration.digest);
}

function lifecycleRulesHold(timeline: OclpRecord): boolean {
  const events = timeline.events as Array<{
    event_type?: unknown;
    sequence?: unknown;
    attempt_id?: unknown;
    status?: unknown;
  }>;
  const requested = events.filter((event) => event.event_type === "invocation-requested");
  if (requested.length !== 1) return false;
  const request = requested[0];
  if (request.sequence !== 0 || request.attempt_id !== undefined || request.status !== undefined) {
    return false;
  }

  const started = events.filter((event) => event.event_type === "attempt-started");
  const attemptIds = started.map((event) => event.attempt_id);
  if (
    attemptIds.some((attemptId) => typeof attemptId !== "string") ||
    new Set(attemptIds).size !== attemptIds.length ||
    started.some((event) => event.status !== undefined || Number(event.sequence) <= 0)
  ) {
    return false;
  }

  const terminal = events.filter((event) => event.event_type === "invocation-terminal");
  if (terminal.length > 1) return false;
  if (!terminal.length) return true;
  const completion = terminal[0];
  if (
    !["succeeded", "failed", "skipped"].includes(String(completion.status)) ||
    Number(completion.sequence) <= 0
  ) {
    return false;
  }
  return !started.some((event) => Number(event.sequence) >= Number(completion.sequence));
}

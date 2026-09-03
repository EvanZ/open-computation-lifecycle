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

type OclpRecord = Record<string, any>;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtures = path.join(root, "tests/conformance");
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
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(coreSchema);

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
assert.equal(executionHierarchyRulesHold(records, recordsByDigest), true);
assert.equal(executionParameterRulesHold(recordsByDigest), true);
assert.equal(executionAcceptanceRulesHold(recordsByDigest), true);

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

const execution = records.get(manifest.lineage.execution_id)!;
assert.equal(execution.computation?.id, manifest.lineage.computation_id);
assert.equal(execution.inputs?.source?.[0]?.id, manifest.lineage.input_artifact_id);
assert.equal(execution.outputs?.result?.[0]?.id, manifest.lineage.output_artifact_id);
assert.equal(
  records.get(manifest.lineage.evidence_id)?.subject?.id,
  manifest.lineage.execution_id,
);
assert.equal(
  records.get(manifest.lineage.started_event_id)?.execution?.id,
  manifest.lineage.execution_id,
);

console.log(
  `Verified ${manifest.valid.length} valid and ${manifest.invalid.length} invalid OCLP fixtures.`,
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

  if (record.kind === "computation") {
    for (const ports of [record.input_ports ?? [], record.output_ports ?? []]) {
      const names = ports.map((port: { name: string }) => port.name);
      if (names.length !== new Set(names).size) {
        return false;
      }
    }
    const parameterDefinitions = record.parameter_definitions ?? [];
    const parameterNames = parameterDefinitions.map(
      (parameter: { name: string }) => parameter.name,
    );
    if (parameterNames.length !== new Set(parameterNames).size) {
      return false;
    }
    const inputPortNames = new Set(
      (record.input_ports ?? []).map((port: { name: string }) => port.name),
    );
    if (parameterNames.some((name: string) => inputPortNames.has(name))) {
      return false;
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
    const evaluators = record.required_evidence ?? [];
    if (evaluators.some((evaluator: OclpRecord) => !implementationIsBound(evaluator))) {
      return false;
    }
    const evaluatorKeys = evaluators.map(implementationKey);
    if (
      evaluatorKeys.some((key: string | undefined) => key === undefined) ||
      evaluatorKeys.length !== new Set(evaluatorKeys).size
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

  if (record.kind === "execution") {
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

  if (record.kind === "evidence" && !implementationIsBound(record.evaluator)) {
    return false;
  }

  return true;
}

function implementationIsBound(implementation: unknown): boolean {
  const value = implementation as OclpRecord | undefined;
  if (!value || typeof value !== "object") return false;
  if (value.artifact && !value.artifact.digest) return false;
  if (value.source?.kind === "artifact" && !value.source.artifact?.digest) {
    return false;
  }
  if (value.source?.kind === "git" && value.source.overlay && !value.source.overlay.digest) {
    return false;
  }
  return true;
}

function implementationKey(implementation: unknown): string | undefined {
  return canonicalize(implementation);
}

function executionParameterRulesHold(
  recordsByDigest: Map<string, OclpRecord>,
): boolean {
  for (const execution of recordsByDigest.values()) {
    if (execution.kind !== "execution") continue;
    const computationDigest = execution.computation?.digest?.value;
    const computation =
      typeof computationDigest === "string"
        ? recordsByDigest.get(computationDigest)
        : undefined;
    if (
      !computation ||
      computation.kind !== "computation" ||
      computation.id !== execution.computation?.id
    ) {
      return false;
    }
    const definitions = computation.parameter_definitions ?? [];
    const byName = new Map(
      definitions.map((definition: { name: string }) => [definition.name, definition]),
    );
    const values = execution.parameters ?? {};
    if (
      typeof values !== "object" ||
      values === null ||
      Array.isArray(values) ||
      Object.keys(values).some((name) => !byName.has(name))
    ) {
      return false;
    }
    for (const definition of definitions as Array<{
      name: string;
      required?: boolean;
      schema: object;
    }>) {
      const hasValue = Object.prototype.hasOwnProperty.call(values, definition.name);
      if (definition.required !== false && !hasValue) return false;
      if (!hasValue) continue;
      try {
        const validatesValue = ajv.compile(definition.schema);
        if (!validatesValue(values[definition.name])) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

function executionAcceptanceRulesHold(
  recordsByDigest: Map<string, OclpRecord>,
): boolean {
  const executionCounts = new Map<string, number>();
  for (const record of recordsByDigest.values()) {
    if (record.kind === "execution") {
      executionCounts.set(record.id, (executionCounts.get(record.id) ?? 0) + 1);
    }
  }

  const referencesExecution = (
    reference: { id?: unknown; digest?: { value?: unknown } },
    execution: OclpRecord,
    executionDigest: string,
  ): boolean =>
    reference.id === execution.id &&
    (reference.digest?.value === executionDigest ||
      (!reference.digest && executionCounts.get(execution.id) === 1));

  for (const [executionDigest, execution] of recordsByDigest) {
    if (execution.kind !== "execution") continue;
    const computationDigest = execution.computation?.digest?.value;
    const computation =
      typeof computationDigest === "string"
        ? recordsByDigest.get(computationDigest)
        : undefined;
    if (!computation || computation.kind !== "computation") return false;

    const successful = [...recordsByDigest.values()].some(
      (record) =>
        record.kind === "event" &&
        record.status === "succeeded" &&
        referencesExecution(record.execution ?? {}, execution, executionDigest),
    );
    if (!successful) continue;

    for (const evaluator of computation.required_evidence ?? []) {
      const evaluatorKey = implementationKey(evaluator);
      if (evaluatorKey === undefined) return false;
      const satisfied = [...recordsByDigest.values()].some(
        (record) =>
          record.kind === "evidence" &&
          record.subject?.id === execution.id &&
          record.subject?.digest?.value === executionDigest &&
          implementationKey(record.evaluator) === evaluatorKey &&
          record.outcome === "pass",
      );
      if (!satisfied) return false;
    }
  }
  return true;
}

function derivationGraphRulesHold(recordsByDigest: Map<string, OclpRecord>): boolean {
  const adjacency = new Map<string, Set<string>>();

  const resolve = (
    reference: { id?: unknown; digest?: { value?: unknown } },
    expectedKind: string | string[],
  ): string | undefined => {
    const digest = reference.digest?.value;
    if (typeof digest !== "string") return undefined;
    const target = recordsByDigest.get(digest);
    const expectedKinds = Array.isArray(expectedKind) ? expectedKind : [expectedKind];
    if (!target || !expectedKinds.includes(target.kind) || target.id !== reference.id) {
      return undefined;
    }
    return digest;
  };

  for (const record of recordsByDigest.values()) {
    if (record.kind !== "computation") continue;
    const overlay = record.implementation?.source?.kind === "git"
      ? record.implementation.source.overlay
      : undefined;
    if (overlay && !resolve(overlay, "artifact_set")) return false;
  }

  for (const [executionDigest, record] of recordsByDigest) {
    if (record.kind !== "execution") continue;
    if (!resolve(record.computation ?? {}, "computation")) return false;
    for (const references of Object.values(record.inputs ?? {})) {
      for (const reference of references as Array<{ id?: unknown; digest?: { value?: unknown } }>) {
        const inputDigest = resolve(reference, ["artifact", "artifact_set"]);
        if (!inputDigest) return false;
        addEdge(adjacency, inputDigest, executionDigest);
      }
    }
    for (const references of Object.values(record.outputs ?? {})) {
      for (const reference of references as Array<{ id?: unknown; digest?: { value?: unknown } }>) {
        const outputDigest = resolve(reference, ["artifact", "artifact_set"]);
        if (!outputDigest) return false;
        addEdge(adjacency, executionDigest, outputDigest);
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

function executionHierarchyRulesHold(
  recordsById: Map<string, OclpRecord>,
  recordsByDigest: Map<string, OclpRecord>,
): boolean {
  const parents = new Map<string, string>();
  for (const record of recordsByDigest.values()) {
    if (record.kind !== "execution" || !record.parent_execution) continue;
    const reference = record.parent_execution as {
      id?: unknown;
      digest?: { value?: unknown };
    };
    const parent = typeof reference.digest?.value === "string"
      ? recordsByDigest.get(reference.digest.value)
      : typeof reference.id === "string"
        ? recordsById.get(reference.id)
        : undefined;
    if (!parent || parent.kind !== "execution" || parent.id !== reference.id) {
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

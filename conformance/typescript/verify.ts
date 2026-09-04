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
  assert.equal(records.has(String(record.id)), false, `duplicate record ID in ${entry.path}`);
  records.set(String(record.id), record);
}

assert.equal(derivationGraphRulesHold(records), true);
assert.equal(executionHierarchyRulesHold(records), true);
assert.equal(executionParameterRulesHold(records), true);
assert.equal(executionAcceptanceRulesHold(records), true);

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
    if (
      record.implementation?.source?.kind === "git" &&
      record.implementation.source.overlay &&
      record.implementation.source.dirty !== true
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
  if (
    value.source?.kind === "git" &&
    value.source.overlay &&
    value.source.dirty !== true
  ) {
    return false;
  }
  return true;
}

function implementationKey(implementation: unknown): string | undefined {
  return canonicalize(implementation);
}

function executionParameterRulesHold(records: Map<string, OclpRecord>): boolean {
  for (const execution of records.values()) {
    if (execution.kind !== "execution") continue;
    const computation = records.get(String(execution.computation?.id));
    if (
      !computation ||
      computation.kind !== "computation"
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

function executionAcceptanceRulesHold(records: Map<string, OclpRecord>): boolean {
  const referencesExecution = (
    reference: { id?: unknown },
    execution: OclpRecord,
  ): boolean => reference.id === execution.id;

  for (const execution of records.values()) {
    if (execution.kind !== "execution") continue;
    const computation = records.get(String(execution.computation?.id));
    if (!computation || computation.kind !== "computation") return false;

    const successful = [...records.values()].some(
      (record) =>
        record.kind === "event" &&
        record.status === "succeeded" &&
        referencesExecution(record.execution ?? {}, execution),
    );
    if (!successful) continue;

    for (const evaluator of computation.required_evidence ?? []) {
      const evaluatorKey = implementationKey(evaluator);
      if (evaluatorKey === undefined) return false;
      const satisfied = [...records.values()].some(
        (record) =>
          record.kind === "evidence" &&
          record.subject?.id === execution.id &&
          implementationKey(record.evaluator) === evaluatorKey &&
          record.outcome === "pass",
      );
      if (!satisfied) return false;
    }
  }
  return true;
}

function derivationGraphRulesHold(records: Map<string, OclpRecord>): boolean {
  const adjacency = new Map<string, Set<string>>();

  const resolve = (
    reference: { id?: unknown },
    expectedKind: string | string[],
  ): string | undefined => {
    const id = reference.id;
    if (typeof id !== "string") return undefined;
    const target = records.get(id);
    const expectedKinds = Array.isArray(expectedKind) ? expectedKind : [expectedKind];
    if (!target || !expectedKinds.includes(target.kind)) {
      return undefined;
    }
    return id;
  };

  for (const record of records.values()) {
    if (record.kind !== "computation") continue;
    const overlay = record.implementation?.source?.kind === "git"
      ? record.implementation.source.overlay
      : undefined;
    if (overlay && !resolve(overlay, "artifact_set")) return false;
  }

  for (const record of records.values()) {
    if (record.kind !== "execution") continue;
    if (!resolve(record.computation ?? {}, "computation")) return false;
    for (const references of Object.values(record.inputs ?? {})) {
      for (const reference of references as Array<{ id?: unknown }>) {
        const inputId = resolve(reference, ["artifact", "artifact_set"]);
        if (!inputId) return false;
        addEdge(adjacency, inputId, String(record.id));
      }
    }
    for (const references of Object.values(record.outputs ?? {})) {
      for (const reference of references as Array<{ id?: unknown }>) {
        const outputId = resolve(reference, ["artifact", "artifact_set"]);
        if (!outputId) return false;
        addEdge(adjacency, String(record.id), outputId);
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
): boolean {
  const parents = new Map<string, string>();
  for (const record of recordsById.values()) {
    if (record.kind !== "execution" || !record.parent_execution) continue;
    const reference = record.parent_execution as {
      id?: unknown;
    };
    const parent = typeof reference.id === "string"
      ? recordsById.get(reference.id)
      : undefined;
    if (!parent || parent.kind !== "execution") {
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

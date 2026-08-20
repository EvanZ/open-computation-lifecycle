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
const schema = JSON.parse(
  await readFile(path.join(root, "schemas/oclp-record.schema.json"), "utf8"),
);
const manifest = JSON.parse(
  await readFile(path.join(fixtures, "manifest.json"), "utf8"),
) as Manifest;
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

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
  records.set(String(record.id), record);
}

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

const invocation = records.get(manifest.lineage.invocation_id)!;
assert.equal(invocation.definition?.id, manifest.lineage.definition_id);
assert.equal(invocation.inputs?.source?.[0]?.id, manifest.lineage.input_artifact_id);
assert.equal(
  records.get(manifest.lineage.evidence_id)?.subject?.id,
  manifest.lineage.invocation_id,
);
assert.equal(
  records.get(manifest.lineage.event_id)?.invocation?.id,
  manifest.lineage.invocation_id,
);

console.log(`Verified ${manifest.valid.length} valid and ${manifest.invalid.length} invalid OCLP fixtures.`);

function semanticRulesHold(record: OclpRecord): boolean {
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

  return true;
}

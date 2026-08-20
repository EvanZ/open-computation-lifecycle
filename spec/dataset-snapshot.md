# Dataset Snapshot Profile Specification

Status: Experimental profile for OCLP core `0.1.0-draft`.

## 1. Purpose

The dataset-snapshot profile describes one immutable logical dataset version
without copying the dataset into OCLP. It is intended for partitioned files,
object-store prefixes, and exports from databases or warehouses. It does not
define a storage service, table format, query engine, or a claim that a live
database version identifier is a content hash.

The normative words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** have the
same meaning as in the [OCLP Core Specification](https://evanz.github.io/open-computation-lifecycle/protocol/specification/). Core shared
values, JSON rules, canonicalization, and extension rules apply unless this
profile says otherwise.

## 2. Design rationale (non-normative)

This section explains the profile's design choices. It does not alter the
normative requirements above.

| Decision | Rationale and consequence |
| --- | --- |
| The manifest is carried by an ordinary Artifact. | Core already provides content addressing, retrieval hints, and lineage for immutable bytes. A separate snapshot record kind would duplicate those facilities and make profile content less portable. |
| A manifest identifies a version; `dataset_id` identifies the logical dataset. | Teams need a durable name for a continuing dataset and a distinct identity for each immutable version. Treating a table name or bucket prefix as the version would make mutable storage layout part of the identity. |
| Partitions reference exact Artifact records. | A partition can be verified, retrieved, and reused independently. The manifest remains compact for large datasets, and unchanged partitions retain their identity across snapshots. |
| Partition names are unique and sorted. | Unique names make membership unambiguous; a fixed order prevents two semantically identical partition lists from producing different canonical manifest bytes merely because a producer enumerated storage differently. |
| Large services are represented through bounded immutable metadata, not a whole-service hash. | A petabyte-scale lake or live warehouse often cannot be read atomically to calculate a portable byte hash. Immutable exports, table manifests, and partition Artifacts provide a practical integrity boundary while provider-specific snapshot IDs remain useful annotations. |


## 3. Profile declaration

| Declaration | Value |
| --- | --- |
| Profile ID | `dataset-snapshot` |
| Profile version | `0.1.0-draft` |
| Core compatibility | OCLP Core `0.1.0-draft` |
| Dependencies | None |
| Extension surface | Canonical Artifact content: a dataset-snapshot manifest |
| Required Artifact media type | `application/vnd.oclp.dataset-snapshot-manifest+json` |
| Required Artifact schema URI | `urn:oclp:profile:dataset-snapshot:0.1.0-draft` |
| Conformance package | This specification, the published JSON Schema, and the dataset-snapshot valid/invalid vectors |

This declaration satisfies the [Core profile framework](https://evanz.github.io/open-computation-lifecycle/protocol/specification/#extensions-and-profiles).

## 4. Transport and identity

A profile manifest is canonical JSON carried as an ordinary core Artifact. The
producer MUST set that Artifact's `media_type` to
`application/vnd.oclp.dataset-snapshot-manifest+json` and MUST set its
`schema_uri` to `urn:oclp:profile:dataset-snapshot:0.1.0-draft`. The Artifact's
SHA-256 is the immutable identity of the snapshot manifest. Its `dataset_id`
is a stable logical dataset name, not the version identity.

Each partition points to an exact Artifact record. This makes a snapshot a
small, portable graph of immutable metadata and content references rather than
a hash over a potentially enormous live database or data lake.

## 5. Manifest fields

The manifest is a closed JSON object. Its canonical form is JCS canonical JSON
after applying the defaults below.

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `oclp_profile` | default; string | MUST be `"dataset-snapshot"`. It selects the profile shape. Producers SHOULD emit it explicitly when interchanging raw JSON. |
| `oclp_profile_version` | default; string | MUST be `"0.1.0-draft"`. It selects this profile's rules. Producers SHOULD emit it explicitly when interchanging raw JSON. |
| `dataset_id` | required; string | Non-empty logical dataset identifier, for example `"urn:example:dataset:customer-export"`. It groups versions without claiming byte identity. |
| `data_format` | required; string | Non-empty producer-declared format shared by the snapshot partitions, normally a media type such as `"application/vnd.apache.parquet"`. |
| `partitions` | required; non-empty array of DatasetSnapshotPartition | The exact contents of this snapshot. Names MUST be unique and lexically sorted by Unicode code-point order. |
| `parent` | optional; RecordReference | Earlier snapshot-manifest Artifact for incremental lineage. If present, its record digest is REQUIRED. The parent need not have the same partition layout. |
| `annotations` | default; object | Empty object by default. Namespaced, producer-defined JSON metadata such as snapshot timestamps, warehouse version IDs, or retention policy. |

### 5.1 DatasetSnapshotPartition

Each value in `partitions` is a closed object:

| Field | Input status and JSON type | Constraints and rationale |
| --- | --- | --- |
| `name` | required; string | Non-empty unique partition name. A relative path-like name is common, but the profile does not prescribe a path syntax. Sorting makes equivalent manifests canonical before JCS key ordering. |
| `artifact` | required; RecordReference | The Artifact containing this partition's immutable bytes. Its record digest is REQUIRED, so a partition cannot silently resolve to a different Artifact record. |
| `values` | default; object | Empty object by default. Producer-defined JSON partition values, such as `{ "date": "2026-08-19" }`. They aid discovery but do not change the referenced Artifact's identity. |

## 6. Rules for storage systems

A mutable table name, bucket prefix, `latest` pointer, or database Time Travel
identifier is a retrieval or operational hint, never snapshot identity. Put such
information in an Artifact location or in manifest annotations.

For file/object data, a partition Artifact normally hashes the immutable file
bytes. For a large database, warehouse, or data lake, a producer SHOULD publish
an immutable export, table manifest, or bounded partition manifest and describe
that content with Artifacts. It MUST NOT claim an unverified whole-service hash
as an Artifact digest. A profile consumer can still use annotations to locate a
provider-specific snapshot while relying on the bound Artifact graph for
portable integrity.

## 7. Example

```json
{
  "oclp_profile": "dataset-snapshot",
  "oclp_profile_version": "0.1.0-draft",
  "dataset_id": "urn:example:dataset:customer-export",
  "data_format": "application/vnd.apache.parquet",
  "partitions": [
    {
      "name": "date=2026-08-19/part-00000.parquet",
      "artifact": {
        "id": "urn:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "digest": {
          "algorithm": "sha256",
          "value": "2c7a438a16eee01e8403cefea2644319e37237039504ae8b2fada4424097cd3d"
        }
      },
      "values": {
        "date": "2026-08-19"
      }
    }
  ],
  "annotations": {
    "example.org/producer": "partition-writer"
  }
}
```

## 8. Conformance

A conforming profile producer MUST emit a manifest that validates against the
published dataset-snapshot JSON Schema and satisfies this specification. A
consumer MUST accept the valid profile vectors, reject the invalid vectors, and
reproduce their published canonical JSON and digest values. The profile schema
and vectors are executable counterparts to this document.

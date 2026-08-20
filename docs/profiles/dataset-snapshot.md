# Dataset snapshot profile

The dataset-snapshot profile describes one immutable logical dataset version
without copying the dataset into OCLP. It is intended for partitioned files,
object-store prefixes, and exports from databases or warehouses.

The profile is a canonical JSON manifest carried as an ordinary Artifact with
media type `application/vnd.oclp.dataset-snapshot-manifest+json`. The manifest
Artifact's SHA-256 identifies the snapshot version; each partition points to an
exact Artifact record and its record digest.

## Manifest shape

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
        "id": "urn:sha256:…",
        "digest": {"algorithm": "sha256", "value": "…"}
      },
      "values": {"date": "2026-08-19"}
    }
  ]
}
```

`dataset_id` names the logical dataset. The manifest Artifact, rather than the
dataset ID, is the immutable version identity. `parent` may reference an earlier
snapshot manifest Artifact, enabling incremental lineage.

## Rules

- Partition names are unique and lexically sorted.
- Each partition and parent reference includes a record digest.
- `values` contains producer-defined partition values; it does not change the
  referenced Artifact identity.
- A mutable table name, bucket prefix, or `latest` pointer is a retrieval hint,
  never the snapshot identity.

The profile does not require a specific storage service, table format, or query
engine. It does not claim that a database Time Travel ID is a content hash; a
producer may record such a locator in annotations or publish an immutable export
manifest when portable byte identity is required.

The [published JSON Schema](https://github.com/EvanZ/open-computation-lifecycle/blob/main/profiles/dataset-snapshot.schema.json)
and cross-language fixtures define the current executable contract.

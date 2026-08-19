"""Typed records in the experimental OCLP core vocabulary."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    JsonValue,
    TypeAdapter,
    model_validator,
)

OCLP_DRAFT_VERSION = "0.1.0-draft"


class OclpModel(BaseModel):
    """Strict immutable base model for protocol records and value objects."""

    model_config = ConfigDict(extra="forbid", frozen=True)


class Digest(OclpModel):
    algorithm: Literal["sha256"] = "sha256"
    value: str = Field(pattern=r"^[0-9a-f]{64}$")

    def __str__(self) -> str:
        return f"{self.algorithm}:{self.value}"


class RecordReference(OclpModel):
    id: str = Field(min_length=1)
    digest: Digest | None = None


class PortDefinition(OclpModel):
    name: str = Field(min_length=1)
    cardinality: Literal["one", "many"] = "one"
    required: bool = True
    media_types: tuple[str, ...] = ()


class Implementation(OclpModel):
    kind: Literal["python-callable", "container", "command", "other"]
    locator: str = Field(min_length=1)
    digest: Digest | None = None


class ContractReference(OclpModel):
    id: str = Field(min_length=1)
    version: str = Field(min_length=1)


class CoreRecord(OclpModel):
    oclp_version: Literal["0.1.0-draft"] = OCLP_DRAFT_VERSION
    id: str = Field(min_length=1)
    annotations: dict[str, JsonValue] = Field(default_factory=dict)


class Artifact(CoreRecord):
    kind: Literal["artifact"] = "artifact"
    media_type: str = Field(min_length=1)
    digest: Digest
    size: int = Field(ge=0)
    locations: tuple[str, ...] = ()
    schema_uri: str | None = None


class ComputationDefinition(CoreRecord):
    kind: Literal["definition"] = "definition"
    implementation: Implementation
    input_ports: tuple[PortDefinition, ...] = ()
    output_ports: tuple[PortDefinition, ...] = ()

    @model_validator(mode="after")
    def port_names_are_unique(self) -> ComputationDefinition:
        for ports in (self.input_ports, self.output_ports):
            names = [port.name for port in ports]
            if len(names) != len(set(names)):
                raise ValueError("port names must be unique within each direction")
        return self


class Invocation(CoreRecord):
    kind: Literal["invocation"] = "invocation"
    definition: RecordReference
    parameters: dict[str, JsonValue] = Field(default_factory=dict)
    inputs: dict[str, tuple[RecordReference, ...]] = Field(default_factory=dict)
    requested_outputs: tuple[str, ...] = ()


class Evidence(CoreRecord):
    kind: Literal["evidence"] = "evidence"
    subject: RecordReference
    contract: ContractReference
    outcome: Literal["pass", "fail", "error"]
    observed_at: datetime
    details: dict[str, JsonValue] = Field(default_factory=dict)


class LifecycleEvent(CoreRecord):
    kind: Literal["event"] = "event"
    invocation: RecordReference
    event_type: str = Field(min_length=1)
    occurred_at: datetime
    sequence: int = Field(ge=0)
    attempt_id: str | None = None
    data: dict[str, JsonValue] = Field(default_factory=dict)


OclpRecord = Annotated[
    Artifact | ComputationDefinition | Invocation | Evidence | LifecycleEvent,
    Field(discriminator="kind"),
]

OCLP_RECORD_ADAPTER = TypeAdapter(OclpRecord)


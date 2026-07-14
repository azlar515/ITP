from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectOut(ProjectCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShipCreate(BaseModel):
    project_id: int
    hull_no: str
    name: str | None = None


class ShipUpdate(BaseModel):
    hull_no: str | None = None
    name: str | None = None


class ShipOut(ShipCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ItpItemCreate(BaseModel):
    project_id: int
    parent_code: str | None = None
    code: str
    title_zh: str | None = None
    title_en: str
    is_inspection: bool = False
    sort_order: int = 0


class ItpItemUpdate(BaseModel):
    parent_code: str | None = None
    code: str | None = None
    title_zh: str | None = None
    title_en: str | None = None
    is_inspection: bool | None = None
    sort_order: int | None = None


class ItpItemOut(BaseModel):
    id: int
    project_id: int
    parent_id: int | None
    parent_code: str | None
    code: str
    title_zh: str | None
    title_en: str
    level: int
    is_inspection: bool
    before_sea_trial: bool = False
    active: bool = True
    sort_order: int
    children: list["ItpItemOut"] = []

    class Config:
        from_attributes = True


class ProgressUpdate(BaseModel):
    status: str
    notes: str | None = None
    updated_by: str = "user"
    expected_revision: int | None = None


class ShipProgressOut(BaseModel):
    item_id: int
    code: str
    title_zh: str | None
    title_en: str
    status: str
    notes: str | None
    updated_by: str | None
    updated_at: datetime | None
    completed_at: datetime | None
    revision: int = 0


class AuditLogOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int | None
    action: str
    summary: str
    before_json: str | None
    after_json: str | None
    actor: str
    created_at: datetime

    class Config:
        from_attributes = True


class ImportPreview(BaseModel):
    project_name: str
    rows: int
    creates: list[dict[str, Any]]
    updates: list[dict[str, Any]]
    unchanged: int
    missing_from_upload: list[dict[str, Any]]

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    active_itp_version_id: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items: Mapped[list["ItpItem"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    ships: Mapped[list["Ship"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Ship(Base):
    __tablename__ = "ships"
    __table_args__ = (UniqueConstraint("project_id", "hull_no", name="uq_ship_project_hull"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    hull_no: Mapped[str] = mapped_column(String(80))
    name: Mapped[str | None] = mapped_column(String(180), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="ships")
    progress: Mapped[list["ShipProgress"]] = relationship(back_populates="ship", cascade="all, delete-orphan")


class ItpItem(Base):
    __tablename__ = "itp_items"
    __table_args__ = (UniqueConstraint("project_id", "code", name="uq_itp_project_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("itp_items.id"), nullable=True, index=True)
    item_uid: Mapped[str] = mapped_column(String(36), default=lambda: str(uuid4()), index=True)
    parent_uid: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    version_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    parent_code: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    code: Mapped[str] = mapped_column(String(120), index=True)
    title_zh: Mapped[str | None] = mapped_column(String(260), default=None)
    title_en: Mapped[str] = mapped_column(String(260))
    level: Mapped[int] = mapped_column(Integer, default=1)
    is_inspection: Mapped[bool] = mapped_column(Boolean, default=False)
    before_sea_trial: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="items")
    parent: Mapped["ItpItem | None"] = relationship(remote_side=[id])
    progress: Mapped[list["ShipProgress"]] = relationship(back_populates="item", cascade="all, delete-orphan")


class ShipProgress(Base):
    __tablename__ = "ship_progress"
    __table_args__ = (UniqueConstraint("ship_id", "itp_item_id", name="uq_progress_ship_item"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ship_id: Mapped[int] = mapped_column(ForeignKey("ships.id"), index=True)
    itp_item_id: Mapped[int] = mapped_column(ForeignKey("itp_items.id"), index=True)
    item_uid: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    version_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    code_snapshot: Mapped[str | None] = mapped_column(String(120), nullable=True)
    parent_code_snapshot: Mapped[str | None] = mapped_column(String(120), nullable=True)
    title_zh_snapshot: Mapped[str | None] = mapped_column(String(260), nullable=True)
    title_en_snapshot: Mapped[str | None] = mapped_column(String(260), nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=0)
    last_event_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="not_started")
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    updated_by: Mapped[str] = mapped_column(String(120), default="user")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    ship: Mapped[Ship] = relationship(back_populates="progress")
    item: Mapped[ItpItem] = relationship(back_populates="progress")


class ItpVersion(Base):
    __tablename__ = "itp_versions"
    __table_args__ = (UniqueConstraint("project_id", "version_no", name="uq_itp_version_project_no"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    version_no: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(80), default="manual")
    created_by: Mapped[str] = mapped_column(String(120), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ItpVersionItem(Base):
    __tablename__ = "itp_version_items"
    __table_args__ = (UniqueConstraint("version_id", "item_uid", name="uq_version_item_uid"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("itp_versions.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    item_uid: Mapped[str] = mapped_column(String(36), index=True)
    parent_uid: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    parent_code: Mapped[str | None] = mapped_column(String(120), nullable=True)
    code: Mapped[str] = mapped_column(String(120), index=True)
    title_zh: Mapped[str | None] = mapped_column(String(260), default=None)
    title_en: Mapped[str] = mapped_column(String(260))
    level: Mapped[int] = mapped_column(Integer, default=1)
    is_inspection: Mapped[bool] = mapped_column(Boolean, default=False)
    before_sea_trial: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ShipProgressEvent(Base):
    __tablename__ = "ship_progress_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ship_id: Mapped[int] = mapped_column(ForeignKey("ships.id"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    itp_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    item_uid: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    version_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    status_before: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status_after: Mapped[str] = mapped_column(String(30))
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    code_snapshot: Mapped[str | None] = mapped_column(String(120), nullable=True)
    parent_code_snapshot: Mapped[str | None] = mapped_column(String(120), nullable=True)
    title_zh_snapshot: Mapped[str | None] = mapped_column(String(260), nullable=True)
    title_en_snapshot: Mapped[str | None] = mapped_column(String(260), nullable=True)
    updated_by: Mapped[str] = mapped_column(String(120), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(40), index=True)
    summary: Mapped[str] = mapped_column(String(300))
    before_json: Mapped[str | None] = mapped_column(Text, default=None)
    after_json: Mapped[str | None] = mapped_column(Text, default=None)
    actor: Mapped[str] = mapped_column(String(120), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

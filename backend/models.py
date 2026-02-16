from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id")),
    Column("tag_id", Integer, ForeignKey("tags.id")),
)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    completed = Column(Boolean, default=False)

    tags = relationship("Tag", secondary=task_tags, back_populates="tasks")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)

    tasks = relationship("Task", secondary=task_tags, back_populates="tags")


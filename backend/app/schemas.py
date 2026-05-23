from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, date


class TagBase(BaseModel):
    name: str
    color: str
    icon: str

class TagResponse(TagBase):
    id: int
    model_config = ConfigDict(from_attributes=True)



class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    tags: List[str] = []
    scheduled_for: Optional[date] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    completed: bool
    created_at: datetime
    completed_at: Optional[datetime]
    scheduled_for: Optional[date]
    tags: List[TagResponse]
    model_config = ConfigDict(from_attributes=True)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    tags: Optional[List[str]] = None
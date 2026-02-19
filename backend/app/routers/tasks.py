
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta


from ..database import get_db
from .. import models, schemas
from ..services.tag_service import get_or_create_tags


router = APIRouter()

@router.post("/tasks")
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(title=task.title)

    db_task.tags = get_or_create_tags(db, task.tags)

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    return db_task


@router.get("/tasks", response_model=list[schemas.TaskResponse])
def get_tasks(
    date_range: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Task)

    # ---- Date Range Filter ----
    if date_range:
        try:
            start_str, end_str = date_range.split(",")
            start_date = datetime.fromisoformat(start_str)
            end_date = datetime.fromisoformat(end_str)

            query = query.filter(
                models.Task.created_at >= start_date,
                models.Task.created_at <= end_date
            )
        except ValueError:
            return {"error": "Invalid date_range format. Use YYYY-MM-DD,YYYY-MM-DD"}

    # ---- Tag Filter ----
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]

        query = query.join(models.Task.tags).filter(
            models.Tag.name.in_(tag_list)
        )

    tasks = query.all()
    return tasks


@router.patch("/tasks/{task_id}")
def update_task(task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()

    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_update.title is not None:
        db_task.title = task_update.title

    if task_update.completed is not None:
        db_task.completed = task_update.completed

    if task_update.tags is not None:
        db_task.tags = get_or_create_tags(db, task_update.tags)

    db.commit()
    db.refresh(db_task)

    return db_task

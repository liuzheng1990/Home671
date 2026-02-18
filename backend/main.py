from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import schemas
from datetime import datetime, timedelta
from typing import Optional

from services.tag_service import get_or_create_tags


app = FastAPI()


def seed_default_tags(db: Session):

    default_tags = [
        {"name": "Study", "icon": "📚", "color": "primary"},
        {"name": "Music", "icon": "🎵", "color": "success"},
        {"name": "Play", "icon": "🧸", "color": "warning"},
        {"name": "Health", "icon": "🦷", "color": "danger"},
        {"name": "Sport", "icon": "🏃", "color": "info"},
    ]

    existing_count = db.query(models.Tag).count()

    if existing_count == 0:
        for tag_data in default_tags:
            tag = models.Tag(**tag_data)
            db.add(tag)

        db.commit()


models.Base.metadata.create_all(bind=engine)
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    seed_default_tags(db)
    db.close()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/tasks")
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(title=task.title)

    db_task.tags = get_or_create_tags(db, task.tags)

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    return db_task


@app.get("/tasks", response_model=list[schemas.TaskResponse])
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


@app.patch("/tasks/{task_id}")
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




@app.get("/tags", response_model=list[schemas.TagResponse])
def get_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).all()


@app.get("/reports/weekly")
def weekly_report(db: Session = Depends(get_db)):
    one_week_ago = datetime.now() - timedelta(days=7)

    tasks = db.query(models.Task).filter(
        models.Task.created_at >= one_week_ago
    ).all()

    total = len(tasks)
    completed = len([t for t in tasks if t.completed])

    return {
        "tasks_created_last_7_days": total,
        "completed": completed,
        "completion_rate": completed / total if total > 0 else 0
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

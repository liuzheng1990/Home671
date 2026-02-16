from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import schemas
from datetime import datetime, timedelta
from typing import Optional

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/tasks", response_model=schemas.TaskResponse)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):

    db_tags = []
    for tag_name in task.tags:
        tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
        if not tag:
            tag = models.Tag(name=tag_name)
            db.add(tag)
            db.commit()
            db.refresh(tag)
        db_tags.append(tag)

    db_task = models.Task(
        title=task.title,
        description=task.description,
        tags=db_tags
    )

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

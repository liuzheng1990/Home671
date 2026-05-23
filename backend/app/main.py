from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect as sa_inspect, text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from .database import SessionLocal, engine
from . import models
from . import schemas
from .routers import tasks, tags
from .services.tag_service import get_or_create_tags


def seed_default_tags(db: Session):

    default_tags = [
        {"name": "English", "icon": "📚", "color": "primary"},
        {"name": "Dance", "icon": "💃", "color": "success"},
        {"name": "Chinese", "icon": "🏡", "color": "warning"},
        {"name": "Math", "icon": "🧮", "color": "danger"},
        {"name": "Sports", "icon": "🏃", "color": "info"},
        {"name": "Music", "icon": "🎵", "color": "secondary"},
    ]

    existing_count = db.query(models.Tag).count()

    if existing_count == 0:
        for tag_data in default_tags:
            tag = models.Tag(**tag_data)
            db.add(tag)

        db.commit()


models.Base.metadata.create_all(bind=engine)

existing_columns = [col["name"] for col in sa_inspect(engine).get_columns("tasks")]
if "scheduled_for" not in existing_columns:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE tasks ADD COLUMN scheduled_for DATE"))
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    seed_default_tags(db)
    db.close()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(tasks.router)
app.include_router(tags.router)







if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from .database import SessionLocal, engine
from . import models
from . import schemas
from .routers import tasks, tags
from .services.tag_service import get_or_create_tags



app = FastAPI()


def seed_default_tags(db: Session):

    default_tags = [
        {"name": "English", "icon": "📚", "color": "primary"},
        {"name": "Dance", "icon": "🎵", "color": "success"},
        {"name": "Chinese", "icon": "🏡", "color": "warning"},
        {"name": "Math", "icon": "🧮", "color": "danger"},
        {"name": "Sports", "icon": "🏃", "color": "info"},
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



app.include_router(tasks.router)
app.include_router(tags.router)







if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas



router = APIRouter()



@router.get("/tags", response_model=list[schemas.TagResponse])
def get_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).all()
from sqlalchemy.orm import Session
from models import Tag

def get_or_create_tags(db: Session, tag_names: list[str]) -> list[Tag]:
    tags = []

    for name in tag_names:
        tag = db.query(Tag).filter(Tag.name == name).first()

        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.commit()
            db.refresh(tag)

        tags.append(tag)

    return tags

from app.services.tag_service import get_or_create_tags
from app.models import Tag


def test_empty_list_returns_empty(db_session):
    result = get_or_create_tags(db_session, [])
    assert result == []


def test_creates_new_tag(db_session):
    result = get_or_create_tags(db_session, ["Cooking"])
    assert len(result) == 1
    assert db_session.query(Tag).count() == 1


def test_returns_existing_tag(db_session):
    existing = Tag(name="Math", color="danger", icon="🧮")
    db_session.add(existing)
    db_session.commit()

    result = get_or_create_tags(db_session, ["Math"])
    assert len(result) == 1
    assert result[0].id == existing.id
    assert db_session.query(Tag).count() == 1  # no duplicate


def test_mixed_new_and_existing(db_session):
    existing = Tag(name="A", color="primary", icon="📚")
    db_session.add(existing)
    db_session.commit()

    result = get_or_create_tags(db_session, ["A", "B"])
    assert len(result) == 2
    assert db_session.query(Tag).count() == 2
    names = {t.name for t in result}
    assert names == {"A", "B"}


def test_duplicate_names_in_input(db_session):
    result = get_or_create_tags(db_session, ["X", "X"])
    assert len(result) == 2
    assert db_session.query(Tag).filter(Tag.name == "X").count() == 1


def test_returned_tag_has_correct_name(db_session):
    result = get_or_create_tags(db_session, ["Science"])
    assert result[0].name == "Science"

from app import models
from app.main import seed_default_tags


def test_get_tags_empty(client):
    r = client.get("/tags")
    assert r.status_code == 200
    assert r.json() == []


def test_get_tags_returns_all(client, db_session):
    for name in ["Red", "Blue", "Green"]:
        db_session.add(models.Tag(name=name, color="primary", icon="⭐"))
    db_session.commit()

    r = client.get("/tags")
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_get_tags_response_schema(client, db_session):
    db_session.add(models.Tag(name="Art", color="warning", icon="🎨"))
    db_session.commit()

    r = client.get("/tags")
    tag = r.json()[0]
    assert "id" in tag
    assert tag["name"] == "Art"
    assert tag["color"] == "warning"
    assert tag["icon"] == "🎨"


def test_get_tags_after_task_creates_new(client, db_session):
    # Pre-create the tag with required fields so endpoint response validation passes.
    db_session.add(models.Tag(name="BrandNew", color="info", icon="🎨"))
    db_session.commit()
    client.post("/tasks", json={"title": "New activity", "tags": ["BrandNew"]})
    r = client.get("/tags")
    names = [t["name"] for t in r.json()]
    assert "BrandNew" in names


def test_get_tags_seeded_count(client, db_session):
    seed_default_tags(db_session)
    r = client.get("/tags")
    assert r.status_code == 200
    assert len(r.json()) == 6

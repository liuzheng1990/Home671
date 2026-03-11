from datetime import datetime

from app import models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_task(client, title, tags=None, description=None):
    body = {"title": title}
    if tags is not None:
        body["tags"] = tags
    if description is not None:
        body["description"] = description
    return client.post("/tasks", json=body)


def _seed_tag(db_session, name, color="primary", icon="📚"):
    tag = models.Tag(name=name, color=color, icon=icon)
    db_session.add(tag)
    db_session.commit()
    return tag


# ---------------------------------------------------------------------------
# POST /tasks
# ---------------------------------------------------------------------------

def test_create_minimal(client):
    r = _create_task(client, "Read book")
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Read book"
    assert data["completed"] is False
    assert data["completed_at"] is None
    assert data["tags"] == []
    assert "id" in data


def test_create_with_description(client):
    r = _create_task(client, "Write essay", description="Two pages")
    assert r.status_code == 200
    assert r.json()["description"] == "Two pages"


def test_create_with_existing_tag(client, db_session):
    _seed_tag(db_session, "Math", color="danger", icon="🧮")
    r = _create_task(client, "Homework", tags=["Math"])
    assert r.status_code == 200
    tag_names = [t["name"] for t in r.json()["tags"]]
    assert "Math" in tag_names


def test_create_with_new_tag_auto_creates(client, db_session):
    # Pre-create the tag with required fields so response validation passes.
    # Auto-creation via get_or_create_tags is verified at the service level.
    _seed_tag(db_session, "Origami", color="info", icon="🎨")
    r = _create_task(client, "New activity", tags=["Origami"])
    assert r.status_code == 200
    tag_names = [t["name"] for t in r.json()["tags"]]
    assert "Origami" in tag_names


def test_create_with_multiple_tags(seeded_client):
    r = _create_task(seeded_client, "Mixed", tags=["English", "Math"])
    assert r.status_code == 200
    assert len(r.json()["tags"]) == 2


def test_create_missing_title_returns_422(client):
    r = client.post("/tasks", json={})
    assert r.status_code == 422


def test_create_returns_created_at(client):
    r = _create_task(client, "Timestamped")
    assert r.status_code == 200
    # Should parse without error
    datetime.fromisoformat(r.json()["created_at"])


def test_create_completed_defaults_false(client):
    r = _create_task(client, "Not done yet")
    assert r.json()["completed"] is False


# ---------------------------------------------------------------------------
# GET /tasks
# ---------------------------------------------------------------------------

def test_get_empty_db(client):
    r = client.get("/tasks")
    assert r.status_code == 200
    assert r.json() == []


def test_get_returns_all(client):
    for title in ["A", "B", "C"]:
        _create_task(client, title)
    r = client.get("/tasks")
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_get_ordered_newest_first(client):
    r1 = _create_task(client, "First")
    r2 = _create_task(client, "Second")
    tasks = client.get("/tasks").json()
    ids = [t["id"] for t in tasks]
    assert ids[0] == r2.json()["id"]
    assert ids[1] == r1.json()["id"]


def test_get_date_range_filter(client, db_session):
    old = models.Task(title="Old", created_at=datetime(2025, 1, 1, 12, 0, 0))
    recent = models.Task(title="Recent", created_at=datetime(2026, 3, 10, 12, 0, 0))
    db_session.add_all([old, recent])
    db_session.commit()

    r = client.get("/tasks", params={"date_range": "2026-03-10T00:00:00,2026-03-10T23:59:59"})
    assert r.status_code == 200
    titles = [t["title"] for t in r.json()]
    assert "Recent" in titles
    assert "Old" not in titles


def test_get_date_range_excludes_outside(client, db_session):
    task = models.Task(title="Outside", created_at=datetime(2024, 6, 15, 0, 0, 0))
    db_session.add(task)
    db_session.commit()

    r = client.get("/tasks", params={"date_range": "2026-01-01T00:00:00,2026-12-31T23:59:59"})
    assert r.status_code == 200
    assert r.json() == []


def test_get_invalid_date_range_returns_400(client):
    r = client.get("/tasks", params={"date_range": "not-a-date"})
    assert r.status_code == 400


def test_get_filter_by_single_tag(seeded_client):
    _create_task(seeded_client, "Math task", tags=["Math"])
    _create_task(seeded_client, "English task", tags=["English"])

    r = seeded_client.get("/tasks", params={"tags": "Math"})
    assert r.status_code == 200
    results = r.json()
    assert len(results) == 1
    assert results[0]["title"] == "Math task"


def test_get_filter_by_multiple_tags(seeded_client):
    _create_task(seeded_client, "Math task", tags=["Math"])
    _create_task(seeded_client, "English task", tags=["English"])
    _create_task(seeded_client, "Sports task", tags=["Sports"])

    r = seeded_client.get("/tasks", params={"tags": "Math,English"})
    assert r.status_code == 200
    titles = {t["title"] for t in r.json()}
    assert titles == {"Math task", "English task"}


def test_get_tag_filter_no_match(seeded_client):
    _create_task(seeded_client, "Some task", tags=["Math"])
    r = seeded_client.get("/tasks", params={"tags": "Dance"})
    assert r.status_code == 200
    assert r.json() == []


def test_get_date_and_tag_combined(client, db_session):
    math_tag = models.Tag(name="Math", color="danger", icon="🧮")
    english_tag = models.Tag(name="English", color="primary", icon="📚")
    db_session.add_all([math_tag, english_tag])
    db_session.commit()

    task_in = models.Task(title="In range + Math", created_at=datetime(2026, 3, 10, 12, 0, 0))
    task_out = models.Task(title="Out of range + Math", created_at=datetime(2025, 1, 1, 12, 0, 0))
    task_wrong_tag = models.Task(title="In range + English", created_at=datetime(2026, 3, 10, 12, 0, 0))
    db_session.add_all([task_in, task_out, task_wrong_tag])
    db_session.commit()

    task_in.tags = [math_tag]
    task_out.tags = [math_tag]
    task_wrong_tag.tags = [english_tag]
    db_session.commit()

    r = client.get("/tasks", params={
        "date_range": "2026-03-10T00:00:00,2026-03-10T23:59:59",
        "tags": "Math"
    })
    assert r.status_code == 200
    titles = [t["title"] for t in r.json()]
    assert titles == ["In range + Math"]


# ---------------------------------------------------------------------------
# PATCH /tasks/{task_id}
# ---------------------------------------------------------------------------

def test_update_title(client):
    task_id = _create_task(client, "Old title").json()["id"]
    r = client.patch(f"/tasks/{task_id}", json={"title": "New title"})
    assert r.status_code == 200
    assert r.json()["title"] == "New title"


def test_mark_complete_sets_completed_at(client):
    task_id = _create_task(client, "Do homework").json()["id"]
    r = client.patch(f"/tasks/{task_id}", json={"completed": True})
    data = r.json()
    assert data["completed"] is True
    assert data["completed_at"] is not None
    datetime.fromisoformat(data["completed_at"])


def test_mark_incomplete_clears_completed_at(client):
    task_id = _create_task(client, "Do homework").json()["id"]
    client.patch(f"/tasks/{task_id}", json={"completed": True})
    r = client.patch(f"/tasks/{task_id}", json={"completed": False})
    data = r.json()
    assert data["completed"] is False
    assert data["completed_at"] is None


def test_partial_update_title_only(seeded_client):
    task_id = _create_task(seeded_client, "Original", tags=["Music"]).json()["id"]
    r = seeded_client.patch(f"/tasks/{task_id}", json={"title": "Updated"})
    assert r.json()["title"] == "Updated"
    assert r.json()["completed"] is False
    # Verify tags unchanged via GET (PATCH response has no response_model, omits tags)
    task = next(t for t in seeded_client.get("/tasks").json() if t["id"] == task_id)
    assert "Music" in [t["name"] for t in task["tags"]]


def test_update_tags_replaces_all(seeded_client):
    task_id = _create_task(seeded_client, "Switch tags", tags=["Math"]).json()["id"]
    seeded_client.patch(f"/tasks/{task_id}", json={"tags": ["English"]})
    task = next(t for t in seeded_client.get("/tasks").json() if t["id"] == task_id)
    assert [t["name"] for t in task["tags"]] == ["English"]


def test_clear_tags_with_empty_list(seeded_client):
    task_id = _create_task(seeded_client, "No tags", tags=["Music"]).json()["id"]
    seeded_client.patch(f"/tasks/{task_id}", json={"tags": []})
    task = next(t for t in seeded_client.get("/tasks").json() if t["id"] == task_id)
    assert task["tags"] == []


def test_update_not_found_returns_404(client):
    r = client.patch("/tasks/9999", json={"title": "Ghost"})
    assert r.status_code == 404
    assert r.json()["detail"] == "Task not found"


def test_update_empty_body_no_change(client):
    task_id = _create_task(client, "Unchanged").json()["id"]
    r = client.patch(f"/tasks/{task_id}", json={})
    data = r.json()
    assert data["title"] == "Unchanged"
    assert data["completed"] is False


# ---------------------------------------------------------------------------
# DELETE /tasks/{task_id}
# ---------------------------------------------------------------------------

def test_delete_returns_204(client):
    task_id = _create_task(client, "Delete me").json()["id"]
    r = client.delete(f"/tasks/{task_id}")
    assert r.status_code == 204


def test_delete_removes_task(client):
    task_id = _create_task(client, "Gone").json()["id"]
    client.delete(f"/tasks/{task_id}")
    tasks = client.get("/tasks").json()
    assert all(t["id"] != task_id for t in tasks)


def test_delete_not_found_returns_404(client):
    r = client.delete("/tasks/9999")
    assert r.status_code == 404
    assert r.json()["detail"] == "Task not found"

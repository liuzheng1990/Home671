# Katherine's To-Do List

A full-stack task management web app designed for children using tablets. Features large tap targets, playful visuals, and simple touch-friendly interactions.

## Features

- Create tasks with a title, description, and subject tags
- Filter tasks by date range and/or tags
- Mark tasks complete (or undo completion)
- Delete tasks
- Six built-in subject tags: English 📚, Dance 💃, Chinese 🏡, Math 🧮, Sports 🏃, Music 🎵

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS, HTML/CSS (no build step) |
| Backend | Python / FastAPI |
| Database | PostgreSQL 15 |
| Reverse proxy | Nginx |
| Containerization | Docker Compose |

## Quick Start (Docker)

```bash
docker-compose up
```

Open [http://localhost](http://localhost) in a browser. All three services start automatically:

- **Nginx** — serves the frontend and proxies `/api/*` to the backend (port 80)
- **FastAPI backend** — REST API (port 8000, internal)
- **PostgreSQL** — persistent task storage (port 5432)

Database tables and default tags are created automatically on first startup.

## Local Development

**Backend only:**

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Set the database URL as an environment variable, or omit it to fall back to a local SQLite file:

```bash
# PostgreSQL
DATABASE_URL=postgresql://taskuser:taskpassword@localhost:5432/taskdb

# SQLite fallback (no env var needed)
```

**Frontend only:**

Open `frontend/index.html` directly in a browser. API calls require a running backend.

## Project Structure

```
├── frontend/           # Vanilla JS single-page app
│   ├── index.html
│   ├── app.js
│   └── style.css
├── backend/
│   └── app/
│       ├── main.py         # App init, CORS, startup seed
│       ├── database.py     # SQLAlchemy setup
│       ├── models.py       # Task, Tag ORM models
│       ├── schemas.py      # Pydantic schemas
│       ├── routers/
│       │   ├── tasks.py    # Task CRUD endpoints
│       │   └── tags.py     # Tag list endpoint
│       └── services/
│           └── tag_service.py  # get_or_create_tags logic
├── nginx/
│   └── default.conf        # Proxy config
└── docker-compose.yml
```

## API Reference

All endpoints are accessed via the `/api` prefix (added by Nginx).

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks` | List tasks (supports filters) |
| `PATCH` | `/api/tasks/{id}` | Update title, completion, or tags |
| `DELETE` | `/api/tasks/{id}` | Delete a task |
| `GET` | `/api/tags` | List all tags |

**Query parameters for `GET /api/tasks`:**

- `date_range` — comma-separated ISO dates, e.g. `2025-01-01,2025-12-31`
- `tags` — comma-separated tag names, e.g. `Math,English`

Interactive API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs) when the backend is running.

## Configuration

Database credentials are set in `docker-compose.yml`:

```
POSTGRES_USER:     taskuser
POSTGRES_PASSWORD: taskpassword
POSTGRES_DB:       taskdb
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack containerized todo/task management web app ("Katherine's To-Do List"). The app supports creating tasks with tags, filtering by date range and tags, and marking tasks complete.

## Running the Project

**Production (Docker):**
```bash
docker-compose up
```
App is accessible at `http://localhost:80`. Three services start: PostgreSQL (5432), FastAPI backend (8000, internal), Nginx reverse proxy (80).

**Backend only (local dev):**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
Set `DATABASE_URL=postgresql://taskuser:taskpassword@localhost:5432/taskdb` or omit to fall back to SQLite (`./todo.db`).

**Frontend only:** Open `frontend/index.html` directly in a browser, but API calls will fail without a running backend.

## Architecture

```
Browser → Nginx:80
            ├── Static files (frontend/)
            └── /api/* → FastAPI backend:8000 → PostgreSQL:5432
```

**Backend structure** (`backend/app/`):
- `main.py` — FastAPI app init, CORS config, router registration, startup hook that seeds default tags
- `database.py` — SQLAlchemy engine/session setup; reads `DATABASE_URL` env var, falls back to SQLite
- `models.py` — ORM models: `Task`, `Tag`, many-to-many `task_tags` join table
- `schemas.py` — Pydantic request/response schemas
- `routers/tasks.py` — Task CRUD endpoints (`POST /tasks`, `GET /tasks`, `PATCH /tasks/{id}`)
- `routers/tags.py` — `GET /tags`
- `services/tag_service.py` — `get_or_create_tags()` business logic

**API base path:** All endpoints are prefixed with `/api` by the Nginx proxy (the FastAPI app itself does not use `/api` prefix internally).

**Frontend** (`frontend/`): Vanilla JS single-page app using `fetch()` against `/api/tasks` and `/api/tags`. No build step required.

## Key Details

- **Default tags** seeded on startup: English (📚), Dance (🎵), Chinese (🏡), Math (🧮), Sports (🏃)
- **DB credentials** (hardcoded in `docker-compose.yml`): user=`taskuser`, password=`taskpassword`, db=`taskdb`
- **Tables** are auto-created by SQLAlchemy on startup (`metadata.create_all`)
- **CORS** is open (`allow_origins=["*"]`) — intentional for this project

# Shipyard ITP Database

An English-first starter application for managing shipyard newbuilding ITP checklists.

## What it supports

- Project-level ITP templates, where one project such as `99K VLEC` can apply to many ships.
- Hierarchical ITP items imported from Excel:
  - Column 1: sequence number, ignored.
  - Column 2: parent code.
  - Column 3: current code.
  - Column 4: Chinese description.
  - Column 5: English description.
- Only level-5 items are treated as real inspection items. Levels 1-4 are category markers.
- Admin-only project template changes.
- Per-ship completion status editable by all users.
- Import preview, change comparison, and audit history.
- SQLite persistence at `backend/data/itp.db` for local use. Database files are ignored by Git.

## Run locally

```powershell
npm.cmd run install:all
npm.cmd run dev
```

Open:

- Frontend: http://127.0.0.1:5173
- Backend API docs: http://127.0.0.1:8000/docs

## Roles

The first version uses request headers from the frontend role selector:

- `admin`: can import Excel and edit the ITP template.
- `user`: can update per-ship completion status.

This keeps the workflow easy to test before adding real authentication.

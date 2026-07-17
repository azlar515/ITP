# AGENTS.md

This file is the maintenance guide for Codex or any developer working on this
ITP project. Keep it updated when deployment, database rules, or operating
procedures change.

## Project Summary

This repository is a FastAPI + SQLite backend and React/Vite frontend for a
shipyard newbuilding ITP database.

Main purpose:

- Manage project-level ITP templates.
- Manage multiple ships under each project.
- Track per-ship inspection completion status.
- Import/export ITP templates from Excel.
- Preserve inspection records separately from evolving ITP templates.
- Provide admin-only template/project/ship management.

The UI is currently English-first.

## Repository Layout

```text
backend/
  app/
    main.py       # FastAPI routes, auth, import/export, progress APIs
    models.py     # SQLAlchemy database tables
    schemas.py    # Pydantic request/response models
    services.py   # Excel import logic, snapshots, audit helpers
    database.py   # SQLite engine/session setup
  data/
    itp.db        # local SQLite database, ignored by Git

frontend/
  src/
    main.jsx      # React app
    styles.css    # UI styling
  vite.config.js  # base path /ITP/ and /api proxy

docs/
  PROJECT_HISTORY.md
```

## Core Data Rules

Only level 5 ITP items are real inspection items.

- Levels 1 to 4 are category/grouping markers.
- A level 4 item with no child item is an empty category, not an inspection
  item.
- Statistics, progress bars, and completion records should count only real
  inspection items.

Excel template layout:

1. `No.`: display/order reference only. It is not an identity key.
2. `Parent Code`
3. `Current Code`
4. `Chinese Description`
5. `English Description`
6. `Item UID`
7. `Items Before Sea Trial`

Identity rule:

- Inspection records follow `item_uid`.
- If Excel has UID, import should match by UID first.
- If UID is missing, import may fall back to current code.
- New rows without UID get a generated UID.
- Code/title/parent can change while UID remains stable.

Inactive rule:

- Global ITP import deactivates missing active items instead of deleting them.
- Inactive items are hidden from Main and Overview statistics.
- Active ITP export excludes inactive items.
- Admin can restore inactive items.
- Admin can permanently delete inactive items, including UID-linked progress
  and event records, but this is destructive and must be confirmed.

## Database Tables

Important tables:

- `projects`: project records, e.g. 99K VLEC.
- `ships`: ships under projects.
- `itp_items`: current ITP template tree.
- `itp_versions`: ITP template version records.
- `itp_version_items`: item snapshots for each ITP version.
- `ship_progress`: current per-ship status for inspection items.
- `ship_progress_events`: append-only progress event history.
- `audit_logs`: system audit history and rollback source data.

The ITP template and inspection records are intentionally separate. Do not
collapse them into one table.

Current local SQLite path:

```text
backend/data/itp.db
```

Current server SQLite path:

```text
/home/kjxing/server/data/codex-itp/itp.db
```

Database files are not committed to Git.

## Concurrency Rule

Per-ship status updates use optimistic concurrency:

- `ship_progress.revision` stores the current revision.
- Frontend sends `expected_revision`.
- Backend should reject stale updates rather than silently overwriting another
  user's change.

Keep this pattern for multi-user LAN use.

## Authentication

Login is handled by the backend with a single password input on the frontend.

- Password matching determines role: user or admin.
- This is still lightweight internal/demo authentication, not enterprise
  security.
- Do not commit real passwords or secrets to this file.

Admin-only capabilities include:

- Create/edit/delete projects.
- Create/edit/delete ships.
- Import/export ITP templates.
- Edit ITP template items.
- Mark Items Before Sea Trial.
- Activate/deactivate/restore/permanently delete ITP items.
- Rollback supported history records.
- Import/export ship inspection records.

All users can update per-ship inspection completion status.

## Frontend Behavior Rules

Main page:

- Primary data-entry page.
- Show ships as selectable cards to reduce wrong-ship edits.
- After selecting a ship, show the ITP tree starting at level 3.
- Categories expand/collapse by clicking content.
- Level 5 inspection items can change status.
- Default/unfinished status is red; completed status is green.
- A parent category turns green only when all descendant real inspection items
  are complete. Otherwise it remains gray.
- The progress bar under a selected ship is `ITP Completeness`, representing
  the whole ITP completion.

Overview page:

- Read-only.
- Shows all ships as cards, sorted by completed count/progress.
- Shows Items Before Sea Trial and delivery/overall ITP completion.
- Allows viewing unfinished Items Before Sea Trial only, displayed to level 4.
- Does not show history record counts.

Admin page:

- Project and Ships panels are side by side.
- ITP Template panel is wide below them.
- Inactive ITP Items panel sits between Template and History.
- History panel is last.
- Template tree should be expandable/collapsible by clicking content.
- The old Template `Show inactive items` checkbox was removed. Inactive items
  are managed only in the Inactive ITP Items panel.

Delete buttons:

- Every frontend delete action needs a browser confirmation.
- Permanent deletion is destructive and must clearly say it deletes UID-linked
  inspection records/history where applicable.

## Inactive Item Management

Inactive ITP Items panel supports:

- View/hide inactive list.
- Restore an inactive item.
- Permanently delete one inactive item.
- Clear all inactive items.

Deletion protections:

- Single item delete rejects items with child items.
- Bulk clear deletes deepest items first.
- Bulk clear rejects inactive parents that still have active child items.
- Permanent deletion also deletes matching `ship_progress`,
  `ship_progress_events`, and `itp_version_items` records by item id/UID.

Backend route for bulk clear:

```text
DELETE /api/projects/{project_id}/inactive-items
```

## Excel Import/Export Notes

Import preview must be read-only. It must not mutate the database.

Apply modes:

- `partial`: only rows in the upload are created/updated; missing database rows
  are unchanged.
- `global`: uploaded file is treated as the full current template; active
  database items missing from upload are marked inactive.

Exported ITP should use the same columns expected by import and should include
UID. Active ITP export should not include inactive items.

The first `No.` column is not used as an identity key. Reordering rows may
affect display sort order, but should not change identity.

Alternating light-blue row fill is used in generated Excel files to improve
readability.

## Local Development

Install dependencies:

```powershell
npm.cmd run install:all
```

Run both services:

```powershell
npm.cmd run dev
```

Or run separately:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

cd frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Local URLs:

```text
Frontend: http://127.0.0.1:5173/ITP/
Backend:  http://127.0.0.1:8000
Docs:     http://127.0.0.1:8000/docs
```

On Windows, use `npm.cmd` rather than `npm` if PowerShell script execution
policy blocks `npm.ps1`.

Validation before commit:

```powershell
python -m py_compile backend/app/main.py backend/app/models.py backend/app/schemas.py backend/app/services.py
cd frontend
npm.cmd run build
```

## GitHub and Sync Policy

GitHub repository:

```text
https://github.com/azlar515/ITP
```

Important workflow preference from the project owner:

1. Change and verify local code first.
2. Commit locally.
3. Push to GitHub.
4. Pull/deploy on the server.
5. Check local/GitHub/server are synchronized.

Do not modify the server first and then backfill local/GitHub.

When reporting sync, include:

- Local `git rev-parse HEAD`.
- GitHub `git ls-remote --heads origin main`.
- Server `git rev-parse HEAD`.
- Server `git rev-parse origin/main`.
- Web/API HTTP checks.

## Server Deployment

Current server:

```text
Host: 192.168.190.161
User: kjxing
Repository: /home/kjxing/server/apps/codex-itp
Frontend static root: /home/kjxing/server/www/ITP
Database: /home/kjxing/server/data/codex-itp/itp.db
Backend log: /home/kjxing/server/logs/codex-itp-backend.log
Caddy config: /home/kjxing/server/caddy/Caddyfile
Public URL: http://192.168.190.161/ITP/
```

Do not commit server passwords or private credentials.

Backend start command:

```bash
cd /home/kjxing/server/apps/codex-itp/backend
DATABASE_URL="sqlite:////home/kjxing/server/data/codex-itp/itp.db" \
  nohup .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 \
  > /home/kjxing/server/logs/codex-itp-backend.log 2>&1 &
```

Frontend deploy:

```bash
cd /home/kjxing/server/apps/codex-itp/frontend
npm ci
npm run build
mkdir -p /home/kjxing/server/www/ITP
rm -rf /home/kjxing/server/www/ITP/*
cp -a dist/. /home/kjxing/server/www/ITP/
```

Check server:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/ITP/
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/api/projects
curl -s http://127.0.0.1/ITP/ | grep -o 'assets/index-[^" ]*'
```

If GitHub access from the server times out, use a git bundle fallback from
local:

```powershell
git bundle create D:\code\Codex-ITP\itp-update.bundle <old_commit>..main
scp D:\code\Codex-ITP\itp-update.bundle kjxing@192.168.190.161:/home/kjxing/server/apps/codex-itp/itp-update.bundle
```

Then on the server:

```bash
cd /home/kjxing/server/apps/codex-itp
git bundle verify itp-update.bundle
git fetch itp-update.bundle main:refs/remotes/origin/main
git merge --ff-only origin/main
rm -f itp-update.bundle
```

## Server Troubleshooting

If `http://192.168.190.161/ITP/` does not open:

1. Test from local machine:

   ```powershell
   Invoke-WebRequest -UseBasicParsing http://192.168.190.161/ITP/ -TimeoutSec 8
   Invoke-WebRequest -UseBasicParsing http://192.168.190.161/api/projects -TimeoutSec 8
   Test-NetConnection 192.168.190.161 -Port 22
   Test-NetConnection 192.168.190.161 -Port 80
   Test-NetConnection 192.168.190.161 -Port 8000
   ```

2. If SSH, HTTP, and API all time out, it is probably not just the backend.
   Check whether the server is powered on, connected to the network, and still
   using IP `192.168.190.161`.

3. If SSH works, check:

   ```bash
   ss -ltnp 'sport = :80'
   ss -ltnp 'sport = :8000'
   pgrep -af 'uvicorn|app.main'
   docker ps --format '{{.Names}} {{.Status}} {{.Ports}}' | grep -i caddy
   tail -80 /home/kjxing/server/logs/codex-itp-backend.log
   ```

4. Confirm the backend loaded new routes:

   ```bash
   python3 - <<'PY'
   import urllib.request
   text = urllib.request.urlopen('http://127.0.0.1:8000/openapi.json', timeout=5).read().decode()
   print('/api/projects/{project_id}/inactive-items' in text)
   PY
   ```

## Important Cautions

- Do not run destructive Git commands such as `git reset --hard` unless the
  user explicitly asks.
- Do not delete or overwrite SQLite databases during deployment.
- Back up the server database before schema changes or risky import/delete
  work.
- Keep `frontend/dist`, `node_modules`, SQLite databases, and Excel working
  files out of Git.
- Keep README and `docs/PROJECT_HISTORY.md` in mind, but treat this file as the
  current operations guide when there is a conflict.


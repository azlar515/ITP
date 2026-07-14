# Project History and Decisions

This document records the main conversation decisions for the Shipyard ITP Database project. It is intended to preserve project context for future maintenance.

## Project Goal

Build an English-first IT system for shipyard newbuilding ITP checklist management.

The system manages:

- Project-level ITP templates.
- Multiple ships under one project.
- Per-ship inspection completion records.
- Excel import/export.
- Admin-only template management.
- User-editable ship inspection status.
- Audit history and rollback.

## Core Data Rules

### ITP Hierarchy

Excel columns:

1. `No.`: sequence/reference only. The number itself is not used for matching.
2. `Parent Code`: parent item code.
3. `Current Code`: current item code.
4. `Chinese Description`.
5. `English Description`.
6. `Item UID`.
7. `Items Before Sea Trial`.

Hierarchy example:

- Level 1: project name, e.g. `99K VLEC`
- Level 2: system group, e.g. `S`
- Level 3: system category, e.g. `S01` to `S10`
- Level 4: subcategory, e.g. `S0101`
- Level 5: real inspection item, e.g. `S010101`

Important rule:

- Only level 5 items are real inspection items.
- Levels 1-4 are category markers only.
- A level 4 item with no children is an empty category, not an inspection item.
- The frontend should not show level 4 empty categories as inspection records.

### UID Rule

Inspection records follow `item_uid`, not only code.

- If an uploaded Excel row has `Item UID`, it matches the existing ITP item by UID first.
- If UID is missing, the system falls back to `Current Code`.
- New items without UID get an automatically generated UID.
- Code and description can change while UID remains stable.
- Existing inspection records should remain associated through UID.

### Sequence Number Rule

The first Excel column `No.` is not used for identity matching.

The actual row order in Excel is used as `sort_order`, so changing row order may change display order.

## Roles

Current roles:

- `user`: can view ITP and update per-ship inspection completion status.
- `admin`: can manage projects, ships, ITP templates, import/export, rollback, and template markers.

Current admin password for frontend demo:

- `Admin`

Note: This is a frontend-only simple login for early internal testing. A production LAN deployment should move authentication to the backend.

## Main Pages

### Login

Before entering the app:

- `user` button enters directly.
- `admin` button requires password.

### Main

Displays ITP items by project and ship.

Rules:

- Starts from level 3.
- Click category content to expand/collapse.
- Level 5 inspection items can toggle status.
- Default status is unfinished/red.
- Completed status is green.
- If all child inspection items under a category are completed, the parent category shows green.
- If not all are completed, parent remains gray.
- `S1001` belongs to sea trial.
- Other level 4 groups belong to mooring trial.
- Mooring trial progress is displayed separately.

### Overview

Read-only page.

Displays each ship status:

- Project.
- Hull No.
- Ship Name.
- Items Before Sea Trial completion.
- Overall completion.

Overview should not display audit/history record count.

### Admin

Admin-only page.

Features:

- Create/delete project.
- Create/edit/delete ship.
- Export current ITP Excel.
- Import ITP Excel.
- Preview import without applying.
- Apply import only when user clicks Apply.
- View/edit ITP template tree.
- Mark/unmark `Items Before Sea Trial`.
- Show inactive items.
- Restore/deactivate ITP items.
- View history.
- Roll back supported history records.
- Export each ship's inspection records.
- Import each ship's inspection records to overwrite current status for matched items.

## Import Modes

### Partial Update

Only rows present in Excel are processed.

- Existing UID/code: update.
- New item: create and generate UID if missing.
- Missing database items: unchanged.

Partial update cannot reuse a code already used by another existing item.

### Global Replace

Excel is treated as the complete current ITP template for the project.

- Existing UID/code: update.
- New item: create and generate UID if missing.
- Database active items missing from Excel: mark inactive.
- Missing items are not physically deleted.
- Inspection history is preserved.

Inactive items:

- Hidden from Main page.
- Excluded from Overview statistics.
- Excluded from active ITP export.
- Excluded from current inspection progress.
- Visible in Admin when `Show inactive items` is enabled.
- Can be restored by admin.

## Rollback Rules

History rollback supports:

- ITP item create.
- ITP item delete where dependencies allow.
- ITP item update/classify.
- Batch marker changes such as `Items Before Sea Trial`.
- Activate/deactivate batch changes.
- Ship create/update/delete.
- Ship progress changes.

Rollback creates an audit entry and creates a new ITP version snapshot when it changes ITP template data.

## Inspection Records

Inspection records are stored in database tables separate from ITP template tables.

Main tables:

- `itp_items`: current template items.
- `itp_versions`: template version records.
- `itp_version_items`: snapshot of ITP items per version.
- `ship_progress`: current per-ship status.
- `ship_progress_events`: append-only per-ship status history.
- `audit_logs`: system audit history.

Concurrency approach:

- `ship_progress.revision` is used for optimistic concurrency.
- Frontend sends `expected_revision`.
- Backend rejects stale updates with conflict behavior.

## Items Before Sea Trial

Admin can mark ITP template items as `Items Before Sea Trial`.

Rule:

- Marking a parent cascades to descendants.
- Unmarking a parent cascades to descendants.
- Overview statistics count only true level-5 inspection items.

## Excel Export

ITP export uses the same layout expected by import:

1. `No.`
2. `Parent Code`
3. `Current Code`
4. `Chinese Description`
5. `English Description`
6. `Item UID`
7. `Items Before Sea Trial`

Ship inspection record export includes current status and event history.

## Deletion Rules

All frontend delete buttons should use confirmation.

Project/ship/item deletion should not silently destroy important history. Inactive/obsolete is preferred over physical deletion for ITP items that may have inspection records.

## Deployment Notes

Recommended LAN deployment:

- Linux server.
- FastAPI backend behind `systemd`.
- Frontend built with Vite and served by Nginx.
- Nginx proxies `/api` to backend.
- SQLite can be used initially, but PostgreSQL is better for heavier multi-user usage.

Important frontend deployment change:

- Use `/api` instead of hard-coded `http://127.0.0.1:8000/api` for LAN deployment.

Recommended server layout:

```text
/opt/codex-itp/
  app/      # code
  data/     # database
  backups/  # database backups
  logs/     # logs
```

Update process:

1. Back up database.
2. Pull/upload new code.
3. Install backend dependencies if changed.
4. Run frontend build.
5. Restart backend service.
6. Restart or reload Nginx.
7. Verify `/api/projects` and frontend page.

## GitHub

Repository:

```text
https://github.com/azlar515/ITP
```

Initial pushed commit:

```text
7010cb1 Add shipyard ITP management app
```

Ignored from Git:

- SQLite database files.
- `frontend/node_modules`.
- `frontend/dist`.
- Python cache files.
- Excel files.
- Excel temporary lock files.

## Current Important Caveats

- Admin login is simple frontend demo logic, not production authentication.
- Database is SQLite, which is acceptable for early LAN testing but should be monitored if multiple users write concurrently.
- Database backups are required before updates or schema changes.
- Only level 5 items are inspection records. Do not regress this rule.

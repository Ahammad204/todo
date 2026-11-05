# TASKFLOW — Personal Productivity & Task Management

Boss's personal task system: tasks, categories, Tomorrow planner, calendar, analytics,
Inbox capture, Focus mode with Pomodoro, and a report API built for Muse's nightly
11:00 PM (Asia/Dhaka) planning reminder.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Prisma 6 + MongoDB**
(MongoDB Atlas; see Deployment below). Icons: lucide-react. Charts: hand-rolled SVG/CSS.
UI components are hand-rolled equivalents in `components/ui.tsx` (button/dialog/input/
toast/confirm primitives) — shadcn CLI was skipped deliberately to keep the build lean;
the visual language follows the same patterns.

## Quick start

```bash
cd ~/workspace/taskflow
npm install
# Set DATABASE_URL in .env to the MongoDB Atlas connection string first (see .env.example).
# One-time DB setup (pushes the schema, seeds owner + 8 categories, NO sample tasks)
npm run db:setup        # = prisma db push && prisma db seed

npm run dev             # dev server (webpack) on http://localhost:3000
# or production:
npm run build
PORT=3100 npm run start # prod server on http://localhost:3100
```

Open the app → you are redirected to `/login`. The password is `APP_PASSWORD` in `.env`
(default `taskflow-change-me` — **change it in `.env` and restart**). Auth is a single-owner
password gate: the `tf_auth` cookie holds `sha256(APP_PASSWORD)`; `proxy.ts` (Next 16's
middleware) enforces it on every page and API route except `/login`, `/api/login`,
`/api/report`, and `/api/bootstrap` (which use their own token, below).

## Environment variables (`.env`)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | MongoDB Atlas connection string, e.g. `mongodb://user:pass@ac-xxxxx-shard-00-00.host.mongodb.net:27017,.../?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin`. |
| `APP_PASSWORD` | Login password for the single owner account. |
| `REPORT_TOKEN` | Shared secret for `GET /api/report` and `POST /api/bootstrap`. Already generated into the local `.env`; never commit it. |

## Database

- **MongoDB Atlas** via Prisma (`provider = "mongodb"` in `prisma/schema.prisma`).
  Every model's `id` is a MongoDB ObjectId (`String @id @default(auto()) @map("_id")
  @db.ObjectId`) and every foreign key (`userId`, `categoryId`, `taskId`) is
  `@db.ObjectId`. Business fields stay provider-agnostic: dates are `YYYY-MM-DD` /
  `HH:mm` strings, enums are validated strings.
- Entities: `User`, `Category`, `Task`, `Subtask`, `Reminder` (see `prisma/schema.prisma`).
  Tasks have indexes on `(userId, dueDate)` and `(userId, status)`; subtasks/reminders
  cascade-delete with their task; deleting a category sets its tasks' `categoryId` to null.
- All dates/times are computed in **Asia/Dhaka** (`lib/dates.ts`); "today"/"tomorrow" are
  Dhaka calendar days, not server-local days.
- History note: the app was originally built on SQLite, then briefly switched to
  PostgreSQL/Neon, before settling on MongoDB Atlas (Nov 2026). Only MongoDB is
  supported now; `scripts/nightly-report-sqlite.mjs` is a leftover from the SQLite
  era and is no longer used.

## Deployment (Vercel + MongoDB Atlas, via GitHub import)

1. **Prepare Atlas:** in MongoDB Atlas, the cluster's database user and connection
   string are ready (Database → Connect → "Connect your application").
   **Important:** under Network Access, allow access from anywhere (`0.0.0.0/0`) —
   Vercel functions run from ever-changing IPs, so IP allow-listing a few addresses
   will break the deployed app.
2. **Import the repo in Vercel:** New Project → Import Git Repository →
   `Ahammad204/todo` (this app's repo). Framework preset: Next.js. Build command:
   `npm run vercel-build` (the repo's `vercel-build` script runs
   `prisma generate && prisma db push && next build` — `prisma db push` creates the
   collections and indexes in Atlas on every deploy).
3. **Set env vars** on the Vercel project (Settings → Environment Variables, before
   the first deploy finishes or redeploy after):
   - `DATABASE_URL` — the Atlas connection string (with the real DB-user password,
     URL-encoded if it contains special characters).
   - `APP_PASSWORD` — the login password (do not reuse the local default).
   - `REPORT_TOKEN` — a fresh long random token (`openssl rand -hex 24`).
4. **Bootstrap once** (creates the owner user + the 8 default categories in Atlas —
   this replaces running the seed against it):
   ```bash
   curl -X POST https://<your-deployment>.vercel.app/api/bootstrap \
     -H "x-report-token: <REPORT_TOKEN>"
   ```
   Expect `{"ok":true,"created":true}` the first time; later calls return
   `{"ok":true,"already":true}` and change nothing.
5. Open the deployment URL → `/login` → sign in with `APP_PASSWORD`.

## Muse nightly automation integration (11:00 PM Asia/Dhaka)

Two equivalent ways for Muse to fetch the planning report — both read real task data,
never invent tasks, and never modify anything:

1. **HTTP:** `GET /api/report` with header `x-report-token: <REPORT_TOKEN from .env>`.
   Optional `?date=YYYY-MM-DD`. Returns:
   `{ date, tomorrowDate, tomorrow: [...], pendingToday: [...], overdue: [...], topPriority }`
   where each task is `{ id, title, priority, status, category, dueDate, dueTime, estimatedDuration }`.
   The report endpoint bypasses the login cookie and is token-only.
2. **CLI fallback:** `node scripts/nightly-report.mjs [YYYY-MM-DD]` — uses `@prisma/client`
   directly against the same database and prints the identical JSON shape.

The Muse cron (created separately by the main agent) calls one of these at 23:00
Asia/Dhaka and formats the 🌙 reminder. The app itself never auto-completes, deletes,
or reschedules tasks; "Prepare Tomorrow" moves happen only on explicit button clicks.

## Testing

```bash
npm run build                       # production build (webpack) + full type check
PORT=3100 npm run start &           # in another shell:
node scripts/smoke-test.mjs         # 24 end-to-end API checks, prints PASS/FAIL per step
node scripts/nightly-report.mjs     # prints tonight's report JSON
```

The smoke test covers: seed categories, create/edit/complete (completedAt set)/reopen
(completedAt cleared), stats moving, category filter, `/api/report` tomorrow/pending/overdue
buckets + Dhaka dates + 401 without token, recurrence spawning the next occurrence,
duplicate, archive visibility, subtasks, delete + cleanup. It cleans up after itself —
the database returns to empty (seed data only).

## Features

- **Dashboard** — Dhaka greeting/date, today's completion %, 4 stat cards, Today's Focus
  (inline complete), Upcoming, productivity summary (daily/weekly rate, completed this
  week, streak), Smart Suggestions (ranked overdue → priority → deadline, read-only,
  reason shown), Quick Add.
- **Tasks** — full CRUD modal (subtasks editor, recurrence, notes, estimated duration),
  search, filters (category/status/priority), sort (deadline/priority/newest/manual),
  HTML5 drag-and-drop reorder persisted via `sortOrder`, duplicate, archive, delete with
  confirmation, completion animation, toasts.
- **Tomorrow** — tomorrow's tasks (Dhaka +1), add-directly, estimated workload, overlap
  warning for shared time slots, timeline, "Prepare Tomorrow" panel (pending + overdue +
  inbox, move only on click).
- **Calendar** — month grid + week strip, category-coloured chips, click a date for its
  tasks, create-for-date.
- **Analytics** — completed today/week/month, completion rate, overdue, streak, 7-day
  completion bars, category distribution, weekly review card (also highlighted Sundays).
- **Inbox** — dateless tasks, quick capture, inline assign date/category/"do today".
- **Focus** — task picker, distraction-free card, Pomodoro 25/5/15 with progress bar.
- **Settings** — profile (stored on the User record via `/api/profile`), theme toggle
  (sidebar; dark default, stored in localStorage — theme preference only, never task data),
  timezone display, default priority, reminder time display, category manager, JSON export
  (`GET /api/export`).
- **Global** — responsive sidebar / mobile bottom nav, ⌘K / Ctrl+K quick-add anywhere,
  loading spinners, empty states.

Recurring tasks: completing a DAILY/WEEKLY/MONTHLY task spawns the next occurrence
(due date advanced, status TODO, subtasks copied uncompleted) — the completed one stays
as history.

## Known limitations

- Single-owner password gate, not full multi-user auth — by design for a personal app.
  Anyone with `APP_PASSWORD` has full access; change the default.
- The database is MongoDB Atlas only (see Database/Deployment). Atlas network access
  must stay open to `0.0.0.0/0` for Vercel, so the database user credentials are the
  only gate — use a strong, app-only DB user password and rotate it if it leaks.
- Drag-and-drop reorder is desktop HTML5 DnD (touch devices use the other sort modes).
- Category icons are stored as names and shown as text in settings; task rows show the
  category colour dot (icon rendering kept intentionally simple).
- The 11 PM reminder itself is delivered by Muse's scheduler, not by the app; if the
  app server is down, the cron should fall back to `scripts/nightly-report.mjs`.
- On this VM, Prisma engine binaries had to be fetched manually once (sandboxed network
  resets Node's downloader): they live in `node_modules/@prisma/engines/`; a fresh
  `npm install` on an unrestricted network handles this automatically.

# AGENT.md — Realtime Surgery Dashboard

Guide for anyone (human or AI agent) working on this project: what it is, how data flows, how to run it, and the rules that must not be broken.

## 1. Purpose

A web dashboard that shows **live** figures for robotic surgeries and surgeons, read from an existing MongoDB database:

- total surgeries, surgeons, and hospitals; surgeries today, in the last 7 days, and this month; average surgery duration
- surgeries per month, surgeries by category, and the top 10 surgeons
- a list of every surgery with search and filters, a surgeon directory, and a profile page for each surgeon

When a record changes in MongoDB, every open dashboard updates within about 2 seconds, without a page refresh or polling.

## 2. ⚠ Golden rule: the database is READ-ONLY

The database `sutra_dev` belongs to another application that already uses about 140 collections. **This dashboard must never write to it.**

- No seed scripts, test inserts, migrations, `save()`, `update*()`, `delete*()`, and no new collections or indexes.
- Mongoose `autoIndex` and `autoCreate` are switched off in [server/src/config/db.js](server/src/config/db.js). Keep them off.
- App-owned data (portal user accounts, milestone gift records) is stored in **`server/data/app-store.json`** ([server/src/store/store.js](server/src/store/store.js)), not in MongoDB. The file is git-ignored. It is written atomically, and every check-then-insert runs with no `await` in between, which prevents races. To move this data to a separate database later, replace that module.
- The built-in admin login comes from `server/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`). It cannot be disabled from the UI, so an admin can never be locked out.
- To test realtime updates, wait for a real change made by the owning application. Don't insert test data.

## 2a. Roles, registration and rewards

| Role | Can see | How the account is created |
|---|---|---|
| `admin` | Everything: the dashboard, every surgery, the surgeon directory, rewards & gifts, users | The built-in `.env` admin, or added by an admin on **Users & access** |
| `surgeon` | Their own profile, cases and rewards, plus read-only dashboards and cases of **teammates aligned to the same hospital** (My team). The server checks the hospital on every request. | Self-registration at `/register` creates a **pending** account. An admin approves it and **links it to a `surgeon_info` profile**. Admins can also create surgeon accounts directly. |

- One `surgeon_info` profile can be linked to only one enabled account. Disabling an account signs that user out immediately: their socket is disconnected and their token is rejected on the next request.
- **Rewards — trophy badges + customised gifts** ([server/src/services/rewards.js](server/src/services/rewards.js), mirrored in [client/src/utils/tier.js](client/src/utils/tier.js)): 0–49 surgeries = Beginner (no badge); milestones at **50 Bronze · 100 Silver · 200 Gold · 500 Champion · 1000 Legend**. Each milestone unlocks a trophy badge (shown after the surgeon's name everywhere) and a gift that the SSI team customises and sends — surgeons do not choose or request anything.
  - Gift workflow per surgeon + milestone: `preparing` (implicit, no record yet) → `dispatched` (admin enters the gift; optional note to the surgeon) → `delivered`; `preparing`/`dispatched` → `closed` with a reason (e.g. rewarded earlier). Records live in `app-store.json` → `rewards`; the server re-counts surgeries before any change.
  - Surgeons: a trophy popup on login / live when a milestone unlocks, the dashboard rewards card, and **My rewards** (trophy cabinet + gift tracker). Admins: **Rewards & gifts** lists every surgeon profile past a milestone (with or without a portal account), a login popup with gifts still to send, and a live popup when a new case unlocks a milestone.
  - The old free-instrument redemptions (`redemptions` in the store, `REWARD_EVERY_CASES`) are retired.

## 3. Tech stack (MERN)

| Layer | Choice |
|---|---|
| Database | MongoDB Atlas (replica set, so change streams are available) |
| Backend | Node.js, Express 5, Mongoose 9, Socket.IO 4, JWT (`jsonwebtoken`), `bcryptjs` |
| Frontend | React 19, Vite 8, Tailwind CSS 4, Recharts 3, TanStack React Query 5, `socket.io-client`, React Router 7 |
| Dev tooling | `nodemon` (server), `concurrently` (runs server and client from the project root) |

## 4. Folder structure

```
mama_project/
├── AGENT.md                  ← this file
├── package.json              ← root scripts: dev / install:all / build
├── docs/schema.md            ← discovered DB schema + data quirks (read before writing queries)
├── server/
│   ├── .env / .env.example   ← secrets (.env is git-ignored)
│   ├── scripts/
│   │   ├── inspect-db.js     ← read-only schema discovery
│   │   └── hash-password.js  ← makes the bcrypt hash for ADMIN_PASSWORD_HASH (no DB access)
│   └── src/
│       ├── index.js          ← Express + HTTP server + Socket.IO bootstrap
│       ├── config/db.js      ← mongoose connection (read-only settings)
│       ├── models/           ← Surgery, Surgeon, Hospital (strict:false read models)
│       ├── middleware/auth.js← JWT check for REST (requireAuth) and sockets (socketAuth)
│       ├── controllers/      ← auth, stats, surgery, surgeon
│       ├── routes/index.js   ← all /api routes
│       ├── sockets/changeStreams.js ← MongoDB change streams → Socket.IO events
│       └── utils/category.js ← procedure_category normalization
└── client/
    ├── vite.config.js        ← proxies /api and /socket.io to :5000
    └── src/
        ├── main.jsx, App.jsx ← providers + routes
        ├── api/axios.js      ← baseURL /api, adds JWT, 401 → /login
        ├── context/AuthContext.jsx
        ├── hooks/            ← useSocket (live updates), useThemeColors, useDebounced
        ├── pages/            ← Login, Dashboard, Surgeries, Surgeons, SurgeonDetail
        ├── components/
        │   ├── layout/Layout.jsx      ← sidebar, top bar, Live indicator
        │   ├── dashboard/             ← StatCard, MonthlyTrendChart, RankedBarChart, ChartTooltip
        │   └── common/                ← Card, SurgeryTable, Pagination, ProtectedRoute
        ├── utils/format.js
        └── index.css         ← Tailwind + light/dark design tokens
```

## 5. Data flow

```
 ┌──────────────────────┐   change stream   ┌───────────────────────────────┐
 │ MongoDB Atlas        │ ────────────────▶ │ server/sockets/changeStreams  │
 │ sutra_dev            │                   │  • emit surgery:change /      │
 │  surgeries_timesheets│ ◀──── read ────── │    surgeon:change immediately │
 │  (+ _delete), surgeon│   (aggregations)  │  • debounce 2s → recompute    │
 └──────────────────────┘                   │    summary → emit stats:update│
            ▲                               └──────────────┬────────────────┘
            │ read                                         │ Socket.IO (JWT handshake)
 ┌──────────┴───────────┐   REST /api (JWT)   ┌────────────▼────────────────┐
 │ Express controllers  │ ◀────────────────── │ React (React Query cache)   │
 └──────────────────────┘   initial loads     │  stats:update → setQueryData│
                                              │  *:change → invalidate lists│
                                              └─────────────────────────────┘
```

1. **First load:** each page fetches its data over REST, and React Query caches it. `staleTime` is set to `Infinity`, so there is no polling.
2. **Live updates:** `useSocket`, mounted once in `Layout`, opens a single Socket.IO connection using the JWT.
   - `stats:update` replaces the `['summary']` cache, so the stat cards and charts re-render. Changed numbers flash briefly.
   - `surgery:change` and `surgeon:change` invalidate the `['surgeries']`, `['surgeons']` and `['surgeon']` queries, so any page that is open refetches.
3. `computeSummary()` in [statsController.js](server/src/controllers/statsController.js) is the **single source** of the dashboard summary. Both `GET /api/stats/summary` and `stats:update` use it.
4. If a change stream errors, it reopens after 5 s from the last resume token, so no events are lost.

### Socket event contract

| Event | Payload | Client reaction |
|---|---|---|
| `stats:update` | same shape as `GET /api/stats/summary` | `setQueryData(['summary'])` |
| `surgery:change` | `{ operationType, doc }` | invalidate `surgeries`, `surgeon` |
| `surgeon:change` | `{ operationType, doc }` | invalidate `surgeons`, `surgeon` |
| `gift:updated` | gift milestone | invalidate `admin-gifts`, `admin-counts` (new milestones arrive via `surgery:change`, which also refreshes these; [AdminAlerts](client/src/components/rewards/AdminAlerts.jsx) pops up for newly unlocked ones) |
| `user:registered` | `{ name }` | admin toast; invalidate `admin-users` |
| `my:surgery-change` *(surgeon room only)* | `{ operationType }` | invalidate `my-profile`, `my-rewards`, `surgeries` |
| `reward:update` *(surgeon room only)* | `{ tier, status }` | invalidate `my-rewards` |

Rooms: `admins`, `surgeon:<surgeonInfoId>` and `user:<accountId>`. The socket joins its rooms when the handshake is authenticated ([server/src/index.js](server/src/index.js)). Every helper for sending events is in [sockets/notify.js](server/src/sockets/notify.js).

## 6. API (every route except login and register needs `Authorization: Bearer <jwt>`)

Roles are enforced on the server by `requireRole()` in [routes/index.js](server/src/routes/index.js). The route guards in the UI only control what each user is shown.

| Method | Route | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | creates a pending surgeon account |
| GET | `/api/me/profile` | surgeon | own profile: category mix (pie chart), instrument usage (bar chart), recent cases |
| GET | `/api/me/rewards` | surgeon | current trophy, progress to the next milestone, trophy ladder and gift status per unlocked milestone |
| GET | `/api/me/team` | surgeon | every surgeon aligned to my hospital (`surgeon_info.alignedHospital`) with card stats |
| GET | `/api/me/team/:id` | surgeon | a teammate's full profile — 403 unless aligned to the same hospital ([services/team.js](server/src/services/team.js)) |
| GET | `/api/me/inventory/new` | surgeon | newest `master_instrument_types` (shown by the RA-ONE mascot) |
| GET | `/api/me/report/periods` · `/api/me/team/:id/report/periods` · `/api/surgeons/:id/report/periods` | surgeon / surgeon (teammate) / admin | months and quarters that have cases |
| GET | `…/report?period=month&value=YYYY-MM` · `period=quarter&value=YYYY-Qn` · `period=all` | same | export data for that period ([services/report.js](server/src/services/report.js)) |
| GET | `/api/admin/counts` | admin | badge counts |
| GET/POST | `/api/admin/users` | admin | list users · create a user (`role`, `surgeonId` for surgeons) |
| PATCH | `/api/admin/users/:id` | admin | `{ action: approve\|reject\|disable\|enable, surgeonId? }` |
| GET | `/api/admin/gifts` | admin | every surgeon past a milestone with each gift's status, plus status counts |
| PATCH | `/api/admin/gifts/:surgeonId/:tier` | admin | `{ status: dispatched\|delivered\|closed, gift?, adminNote? }` |

Routes from the first version (every route below is admin-only, except `/api/surgeries`, which a surgeon can call but only gets their own cases):

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` (token valid for 12 h) |
| GET | `/api/auth/me` | current user |
| GET | `/api/stats/summary` | totals, `monthlyTrend` (latest 12 months with data), `byCategory`, `topSurgeons`, `recentSurgeries` |
| GET | `/api/surgeries` | paginated list. Query: `page, limit(≤100), search, category, hospital, surgeonId, from, to (YYYY-MM-DD), sort` |
| GET | `/api/surgeries/filters` | normalized categories and hospital names for the dropdowns |
| GET | `/api/surgeons` | paginated list with `surgeryCount` and `hospitalName`. Query: `page, limit, search` |
| GET | `/api/surgeons/:id` | profile, surgery count, category breakdown, last 10 surgeries |

## 7. Data source and quirks (full details in [docs/schema.md](docs/schema.md))

- **Surgeries come from `surgeries_timesheets`**, the collection the surgery app writes to today (2022 → present, ~13.6k docs). `surgeries_complete_list` stopped receiving records in Nov 2025 and is no longer read. All access goes through [services/surgeryData.js](server/src/services/surgeryData.js): it resolves the ObjectId references (surgeon, hospital, procedure type, category, system) from small cached lookup collections and maps each doc to the flat row shape the UI uses (`date_of_surgery`, `surgeon_name`, `hospital_name`, `procedure_name`, `procedure_category`, `system_no`, `surgery.duration`). Never send raw docs to the browser — they hold patient details.
- `hospitalInfo.surgeryDate` is a Date at **UTC midnight of the surgery day**. A few have typo years (0026, 0206): they count as surgeries but are excluded from date-based figures (`MIN_VALID_DATE`).
- `surgeryInstrumentsInfo.surgery.duration` is a string in several formats (`"02:51:24"`, `"2h 42min"`, `"6h 10m"`) or junk (`"145:35:00"`). Only use it through `parseDurationMs()`, which keeps 1 min – 24 h.
- `hospitalInfo.surgeonId` is an ObjectId; ~15% of docs have none or an id that isn't in `surgeon_info`. Several hospitals share a name, so hospital labels add the short address ("Manipal Hospital, Jaipur") and filters use hospital ids.
- Deleted cases are moved to `surgeries_timesheets_delete` (full doc), which is watched only to notify the affected surgeon.
- "Hospitals served" counts only hospital ids that exist in `hospitals`; cases pointing at an unknown hospital id are reported as `unlistedHospitalCases`.
- Dashboard export (surgeon pages → Export → Monthly / Quarterly / All surgeries): PowerPoint via `pptxgenjs` (cover, overview, monthly trend, types, instruments, procedures, case log — native editable charts) and Excel via `exceljs` (Summary sheet with chart images drawn in [utils/chartImages.js](client/src/utils/chartImages.js), plus filterable data sheets incl. every case). Both are loaded on demand ([utils/exportReport.js](client/src/utils/exportReport.js)).
- Surgeon sections "Upcoming SSI events" and "Social profile" are static content: edit [data/ssiEvents.js](client/src/data/ssiEvents.js) (six slots, placeholders until a slot has a `title`) and [data/socialProfiles.js](client/src/data/socialProfiles.js) (YouTube channels + photos in `client/src/assets/social/`).
- Surgeon trophy tiers ([utils/tier.js](client/src/utils/tier.js) + server `rewards.js`): 0–49 Beginner (no badge) · 50 Bronze · 100 Silver · 200 Gold · 500 Champion · 1000 Legend. Trophy artwork: [TrophyIcon](client/src/components/rewards/TrophyIcon.jsx).

## 8. Running locally

```bash
npm run install:all          # root + server + client dependencies
# server/.env must exist — copy server/.env.example and fill it in
npm run dev                  # server on :5000, client on http://localhost:5173
```

- Default login: `admin@dashboard.local` / `admin123`. To change the password, run `npm run hash-password --prefix server -- "new-pass"` and paste the output into `ADMIN_PASSWORD_HASH` in `.env`, keeping the single quotes.
- **Network note:** the office DNS refuses MongoDB `+srv` lookups (`querySrv ECONNREFUSED`). For that reason `.env` uses the non-SRV form `mongodb://host1,host2,host3/?tls=true&authSource=admin&replicaSet=atlas-qtp1ni-shard-0`. On another network, the original `mongodb+srv://…` string works too.
- `npm run inspect-db --prefix server` re-runs the read-only schema discovery.

## 9. Conventions for new work

- **New API endpoint:** add the controller in `server/src/controllers/`, then register it in `routes/index.js` behind `requireAuth`. Use read operations only.
- **New dashboard metric:** add it to `computeSummary()` so the REST response and the live update stay identical.
- **New live data:** watch the collection in `sockets/changeStreams.js` (`WATCHED` list), emit `<entity>:change`, and handle it in `client/src/hooks/useSocket.js`.
- **Charts:** bar charts use one series in teal (`--accent`). The pie charts use `--pie-1..4` plus a gray `--pie-other`. Those four colors (violet, green, yellow, magenta) are the only non-blue set that stays distinguishable for colour-blind and normal vision in both light and dark mode, so the pie is capped at 4 named slices plus "Other". Keep bars thin with 4px rounded ends and hairline gridlines, add a hover tooltip, and don't use dual axes. Text uses the ink color tokens, never the series color.
- **Styling:** use the Tailwind token classes (`bg-surface`, `text-ink-2`, `border-line`, `text-accent`…). Light and dark mode follow the operating-system setting.

## 10. Security notes / TODO before production

- Rotate the Atlas password, because it was shared in chat. Ideally, create a **read-only** Atlas user for this app.
- Replace the default admin password, and keep `JWT_SECRET` secret.
- Restrict `CLIENT_ORIGIN` / CORS to the deployed URL.
- Leftover from early development: a `dashboard_users` collection with one document was created before the read-only rule existed. The app doesn't use it. The database owner can drop it.

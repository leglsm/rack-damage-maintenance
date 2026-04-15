# Rack Damage Maintenance (Opmobility)

Web application for **warehouse rack damage reporting and maintenance** across **multiple plants** (factories). After sign-in, staff **choose a plant**, then use an interactive floor map per plant, track issues, view analytics scoped to that plant, and export reports.

**Live site:** [https://rack-damage-maintenance.vercel.app](https://rack-damage-maintenance.vercel.app)

## Features

- **Plants** — After login, pick a plant from `/plants` (or **Add new plant**). Choice is stored in a browser cookie; Map, Issues, and Dashboard require a selected plant. Switch plants anytime via **Plants** in the sidebar.
- **Interactive map** — One master floor plan per plant; draggable “spotter” pins; grid-style location hints; long-press / controls for precise placement.
- **Issues** — List and manage damage reports with photos, priority, and status (reported / in progress / repaired), filtered to the current plant’s floor plan.
- **Dashboard** — Charts for issues over time and breakdowns by priority, status, and component (Chart.js), scoped to the current plant.
- **PDF export** — Generate an issues summary PDF for sharing or records.
- **Authentication** — Supabase Auth with email/password login and **invite flow** for new users (password setup via `/auth/confirm` with `token_hash`).
- **Admin tools** — Configurable admin emails; upload / manage floor plan for the selected plant (non-admins see an appropriate empty state).
- **Settings** — In-app preferences (e.g. display options).

## Tech stack

| Area | Choice |
|------|--------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Backend / Auth / DB | [Supabase](https://supabase.com) (`@supabase/ssr`, RLS helpers in `supabase/`) |
| Charts | Chart.js, react-chartjs-2 |
| PDF / Canvas | jsPDF, html2canvas |
| Deploy | [Vercel](https://vercel.com) |

## Prerequisites

- Node.js 20+ (recommended)
- A Supabase project with Auth enabled, **`plants`** and **`floor_plans.plant_id`** (see migrations), plus tables/storage as in your environment

## Database setup

Run the SQL in **`supabase/migrations/20260414120000_plants_one_floor_plan_per_plant.sql`** in the Supabase SQL Editor (creates `plants`, seeds names, adds `floor_plans.plant_id`, one plan per plant, and RLS on `plants`). Optionally align policies with **`supabase/enable-rls.sql`** for other tables.

### Supabase CLI (optional)

The repo includes **`supabase/config.toml`** from `supabase init`. Link your hosted project once (needs browser login + DB password you set in Supabase):

```bash
npm run db:login
```

When the CLI prints `Press Enter to open browser`, press **Enter**, finish login in the browser, then:

```bash
npm run db:link
```

`db:link` prompts for the **database password** (Settings → Database; reset there if you forgot). To pass it non-interactively (e.g. CI), use env `SUPABASE_ACCESS_TOKEN` after login, and `supabase link --project-ref <ref> -p "<password>"` — avoid committing passwords.

Apply local migrations to the linked remote:

```bash
npm run db:push
```

#### Schema snapshot (refactors, docs, sharing with AI)

After `db:link`, dump the **linked remote** schema (tables, constraints, policies, etc.) to a local file:

```bash
npm run db:schema-dump
```

Writes **`supabase/snapshots/schema-remote.sql`** (gitignored by default). You may be prompted for the **database password** again. Open the file and paste **sanitized excerpts** into chat when you want help refactoring against the real DB shape.

To **version** that file for your team, remove the `snapshots/schema-remote.sql` line from **`supabase/.gitignore`**.

Change **`project ref`** in `package.json` (`db:link` script) if you use a different Supabase project.

#### `db:link` → `Authorization failed` / `Not Found`

That response is from the **Management API** (before it asks for the DB password). Usually:

1. **Wrong project ref** — In the dashboard, **Settings → General → Project ID** use **Copy**, then paste into `package.json`’s `db:link` script. Easy to mis-copy (`I` vs `l`, `0` vs `O`).
2. **Wrong Supabase account** — Run `npm run db:projects` and confirm **rack-damage-maintenance** appears. If the list is empty or the project is missing, run `npm run db:login` again with the account that **owns** that project.
3. **Debug** — `npm run db:link -- --debug`

Do **not** paste CLI login URLs or verification codes into public chats; treat them like passwords.

## Environment variables

Create `.env.local` in the project root (never commit this file; it is gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Optional (comma-separated emails allowed to manage the floor plan):

```bash
NEXT_PUBLIC_ADMIN_EMAILS=you@company.com
```

Set the same variables in **Vercel** → Project → Settings → Environment Variables for production.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home route redirects to `/map`; if you are signed in and have not chosen a plant yet, middleware sends you to **`/plants`** first.

### Other scripts

```bash
npm run build   # production build
npm run start   # run production server locally
npm run lint    # ESLint
```

## Repository layout (high level)

- `app/` — App Router pages: plants, map, issues, dashboard, settings, login, auth confirm (route groups for main shell vs auth-only layouts).
- `components/` — UI including map, issues, dashboard, plants picker, auth, and shell.
- `lib/` — Supabase clients, auth helpers, **selected plant cookie helpers**, PDF export, formatting utilities.
- `supabase/` — SQL migrations, RLS (`enable-rls.sql`), and email template sources.

## Email templates

Invite and other auth emails are configured in the **Supabase Dashboard** (Authentication → Email Templates). The repo includes `supabase/email-templates/invite-user.html` as a copy-paste source for the **Invite user** body.

## License

This project is maintained for internal / partner use; rights belong to the project owner unless otherwise stated.

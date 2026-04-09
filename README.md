# Rack Damage Maintenance (Opmobility Greer)

Web application for **warehouse rack damage reporting and maintenance**, built for **Opmobility Greer**. Staff can place issues on an interactive floor map, track status, view analytics, and export reports.

**Live site:** [https://rack-damage-maintenance.vercel.app](https://rack-damage-maintenance.vercel.app)

## Features

- **Interactive map** — Floor plan image with draggable “spotter” pins; grid-style location hints; long-press / controls for precise placement.
- **Issues** — List and manage damage reports with photos, priority, and status (reported / in progress / repaired).
- **Dashboard** — Charts for issues over time and breakdowns by priority, status, and component (Chart.js).
- **PDF export** — Generate an issues summary PDF for sharing or records.
- **Authentication** — Supabase Auth with email/password login and **invite flow** for new users (password setup via `/auth/confirm` with `token_hash`).
- **Admin tools** — Configurable admin emails; upload / manage floor plan (non-admins see an appropriate empty state).
- **Settings** — In-app preferences (e.g. display options).

## Tech stack

| Area | Choice |
|------|--------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Backend / Auth / DB | [Supabase](https://supabase.com) (`@supabase/ssr`, Row Level Security helpers in `supabase/`) |
| Charts | Chart.js, react-chartjs-2 |
| PDF / Canvas | jsPDF, html2canvas |
| Deploy | [Vercel](https://vercel.com) |

## Prerequisites

- Node.js 20+ (recommended)
- A Supabase project with Auth enabled and tables/storage configured for your environment

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

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home route redirects to `/map`.

### Other scripts

```bash
npm run build   # production build
npm run start   # run production server locally
npm run lint    # ESLint
```

## Repository layout (high level)

- `app/` — App Router pages: map, issues, dashboard, settings, login, auth confirm (route groups for main shell vs auth-only layouts).
- `components/` — UI including map, issues, dashboard, auth, and shell.
- `lib/` — Supabase clients, auth helpers, PDF export, formatting utilities.
- `supabase/` — SQL (e.g. RLS) and email template sources for the dashboard.

## Email templates

Invite and other auth emails are configured in the **Supabase Dashboard** (Authentication → Email Templates). The repo includes `supabase/email-templates/invite-user.html` as a copy-paste source for the **Invite user** body.

## License

This project is maintained for internal / partner use; rights belong to the project owner unless otherwise stated.

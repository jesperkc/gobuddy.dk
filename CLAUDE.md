# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GoBuddy is a Danish social platform for finding friends with shared hobbies/interests. Users create profiles, select interests, share location, and connect with nearby like-minded people. The UI is in Danish.

## Commands

```bash
npm run dev          # Start dev server on port 3002
npm run build        # Production build (vite build)
npm run lint         # ESLint
npm test             # Playwright tests (headless)
npm run test:ui      # Playwright tests with UI debugger
npm run types        # Regenerate Supabase TypeScript types into database.types.ts
```

## Architecture

**Framework:** TanStack Start (SSR) on top of Vite + React 18 + TypeScript. Configured in `app.config.ts` with `node-server` preset.

**Routing:** TanStack Router with file-based routes in `app/routes/`. The route tree is auto-generated in `app/routeTree.gen.ts` — do not edit manually. Root route (`app/routes/__root.tsx`) wraps everything in `AuthProvider`.

**Path aliases:**
- `@/` → `./src/`
- `~/` → `./app/`

**Key directories:**
- `app/routes/` — Pages and API routes (TanStack file-based routing)
- `app/routes/godaddy/` — Admin panel (role-protected)
- `app/routes/api/` — Server-side API endpoints
- `src/components/` — React components (UI primitives in `ui/`, form helpers in `form/`)
- `src/contexts/` — React contexts (AuthContext with Supabase auth)
- `src/store/` — Zustand stores (user profile state)
- `src/lib/` — Utilities, Supabase client, SSR helpers

**State management:** Zustand for global state (`src/store/userProfile.ts`), React Context for auth (`src/contexts/AuthContext.tsx`).

**Backend:** Supabase for auth, database, and admin API. Client initialized in `src/lib/supabase.ts`. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`.

**Strava integration:** OAuth 2.0 connection stored in `strava_connections` table. Environment variables: `VITE_STRAVA_CLIENT_ID` (public), `VITE_STRAVA_CLIENT_SECRET` (client secret), `VITE_APP_URL` (base URL for OAuth redirect). Create a Strava API app at https://www.strava.com/settings/api. Set the callback domain to your `VITE_APP_URL`.

**Styling:** Tailwind CSS v4 with `@tailwindcss/postcss`. Config in `tailwind.config.js`, base styles in `src/index.css`. Uses shadcn/ui-style components with CSS variables for theming and Radix UI primitives. Custom font: `amifer` (used for headings).

**SSR considerations:** The app uses TanStack Start for SSR. Browser-only code must use utilities from `src/lib/ssr-utils.ts` (`isBrowser`, `useClientEffect`, `ClientOnly`, `safeWindow`, etc.) to avoid hydration mismatches.

**Signup flow:** Multi-step onboarding: landing → details → interests → location → signup → email confirmation → profile.

**Maps:** Leaflet/React-Leaflet for location display. OpenStreetMap Nominatim API for geocoding.

**Database types:** Auto-generated from Supabase schema into `database.types.ts`. Regenerate with `npm run types`.

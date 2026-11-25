# New developer onboarding

From clone to a running app and green tests. See `CLAUDE.md` for conventions.

## 1. Setup

```mermaid
flowchart TD
  A["git clone"] --> B["nvm use<br/>(.nvmrc: Node 22)"]
  B --> C["npm ci"]
  C --> D["cp .env.example .env"]
  D --> E["Fill VITE_SUPABASE_URL<br/>VITE_SUPABASE_PUBLISHABLE_KEY<br/>VITE_STRAVA_CLIENT_ID<br/>VITE_APP_URL"]
  E --> F["npm run dev"]
  F --> G["http://gobuddy.localhost:3002"]
  G --> H{"app boots?"}
  H -->|"no"| I["Supabase client is built at import time:<br/>check the two Supabase vars"]
  H -->|"yes"| J["Sign up through /interests,<br/>or use the test users"]
```

Optional, only when working on those features:

| Need | Variables / steps |
|---|---|
| Admin pages (`/godaddy/*`) | An account with the admin role |
| Strava integration | `VITE_STRAVA_CLIENT_ID`, Strava API app with callback domain = `VITE_APP_URL`, `STRAVA_CLIENT_SECRET` as a Supabase secret |
| Admin user generation | `VITE_CLAUDE_KEY` (semi-public, browser-shipped; do not reuse) |
| Edge Functions | `supabase secrets set --env-file=...` with `SB_SECRET_KEY`, `STRAVA_CLIENT_SECRET`, `STRAVA_WEBHOOK_VERIFY_TOKEN`, `CLAUDE_KEY` |

## 2. How the pieces fit

```mermaid
flowchart LR
  subgraph Browser
    R["app/routes/*<br/>TanStack Router pages"]
    C["src/components/*<br/>shadcn/ui + app components"]
    S["src/store/*<br/>Zustand: onboarding, userProfile,<br/>emailVerification, events, activityPosts"]
    X["src/contexts/AuthContext"]
    LIB["src/lib/*<br/>supabase client, ssr-utils, track"]
  end
  subgraph SSR["TanStack Start (node-server)"]
    API["app/routes/api/*"]
  end
  subgraph Supabase
    AUTH["Auth"]
    DB[("Postgres + RLS<br/>supabase/migrations")]
    EF["Edge Functions<br/>delete-account, suggest-bio,<br/>strava-*, admin-*, generate-relations"]
  end
  STRAVA["Strava"]

  R --> C
  R --> S
  R --> X
  S --> LIB
  X --> LIB
  LIB -->|"publishable key"| AUTH
  LIB -->|"publishable key"| DB
  LIB -->|"functions.invoke"| EF
  EF -->|"secret key"| DB
  EF <--> STRAVA
  R --> API
```

Rules of thumb:
- Browser-only code goes through `src/lib/ssr-utils.ts` (`isBrowser`, `useClientEffect`, `ClientOnly`) to avoid hydration mismatches.
- Anything needing the secret key (create/delete user, Strava code exchange) is an Edge Function, never client code.
- `app/routeTree.gen.ts` is generated. Do not edit it.

## 3. Daily workflow

```mermaid
flowchart TD
  A["Branch from main"] --> B["npm run dev"]
  B --> C["Change code"]
  C --> D{"touched UI?"}
  D -->|"yes"| E["Use shadcn/ui + Tailwind scales<br/>(no arbitrary colors)<br/>Check /godaddy/design-system<br/>Update DESIGN.md"]
  D -->|"no"| F
  E --> F{"touched the database?"}
  F -->|"yes"| G["New file in supabase/migrations<br/>then npm run types"]
  F -->|"no"| H
  G --> H["npm run lint"]
  H --> I["npm test<br/>(Playwright)"]
  I --> J["Open PR to main<br/>CI runs Playwright"]
```

Database changes: add a migration, then regenerate `database.types.ts` with `npm run types`. Tests that create real accounts need `SB_SECRET_KEY`; without it they skip (this is the case in CI).

## 4. Tests

| Command | What |
|---|---|
| `npm test` | Playwright, headless (starts `npm run dev` if not running) |
| `npm run test:ui` | Playwright UI debugger |
| `npm run storybook` | Storybook on port 6006 |

Test credentials (`TEST_USER_*`, `TEST_ADMIN_*`) go in `.env.test`. See `tests/README.md`.

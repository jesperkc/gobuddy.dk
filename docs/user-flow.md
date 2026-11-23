# New user flow

What a person sees from first visit to first match. Derived from `app/routes/` and `src/store/`. Update this file when a route's redirects or the home-page prompts change.

## 1. Onboarding (signup)

State lives in the persisted `useOnboardingStore` (localStorage) until signup, then `reset()` clears it. The stepper has 3 steps: Interesser → Placering → Opret konto.

```mermaid
flowchart LR
  L["/ Landing"] -->|"Opret gratis profil"| I["/interests<br/>step 1: Interesser"]
  L -->|"Log ind"| LOGIN["/login"]
  I -->|"Næste"| LOC["/location<br/>step 2: Placering"]
  LOC -->|"Tilbage"| I
  I -->|"Tilbage"| L
  LOC -->|"Næste"| S["/signup<br/>step 3: Opret konto"]
  D["/details"] -.->|"redirect (legacy)"| S
  S --> V{"supabase.auth.signUp<br/>session issued?"}
  V -->|"yes: Confirm email OFF"| H["/home"]
  V -->|"no: Confirm email ON"| CE["/confirmemail?email="]
  CE -->|"click link in email"| C["/complete<br/>mark_email_verified"]
  C --> H
  LOGIN --> H
```

Validation on `/signup`: password ≥ 8 characters, age ≥ `MIN_AGE` (18) and ≤ `MAX_AGE`.

## 2. First visit to `/home`

`/home` is wrapped in `ProtectedRoute` (redirects to `/` when logged out). What shows depends on `verified` (email proven) and on whether the profile has a bio.

```mermaid
flowchart TD
  H["/home"] --> VQ{"email verified?"}

  VQ -->|"no (verified = false)"| BANNER["VerifyEmailBanner<br/>people stay locked"]
  BANNER --> UB{"bio written or skipped?"}
  UB -->|"no"| BP1["BioPrompt"]
  UB -->|"yes"| FP1["FirstPostPrompt"]

  VQ -->|"yes (verified = true)"| HAS{"has interests?"}
  HAS -->|"yes"| TM{"nearby top match?"}
  TM -->|"yes"| BM["BestMatchCard<br/>Hi5 / Chat / Propose"]
  TM -->|"no"| NN["NoNearbyBuddies"]
  BM --> ASK
  NN --> ASK
  ASK{"askVisible?<br/>sent a Hi5, or nobody nearby"}
  ASK -->|"yes, bio pending"| BP2["BioPrompt"]
  ASK -->|"yes, bio done"| FP2["FirstPostPrompt"]
  ASK -->|"no"| NOTHING["no prompt yet"]

  BM -->|"Propose"| REQ{"requireVerifiedEmail()"}
  REQ -->|"ok"| PD["ProposalDialog"]

  H --> TASKS["Profile checklist:<br/>name, age, interests, location, avatar, bio"]
```

Rules worth knowing:
- The bio is always asked before the first post.
- The bio checklist item is hidden while the `BioPrompt` card is on screen (one prompt is enough).
- `askVisible` is true when unverified, or verified and (a Hi5 has been sent or there is no top match).

## 3. After onboarding

```mermaid
flowchart LR
  H["/home"] --> B["/buddies"]
  H --> F["/feed"]
  H --> P["/profile"]
  H --> A["/activities"]
  B --> BU["/buddy/:slug"]
  BU --> CH["/chat/:buddyId"]
  P --> PE["/profile-edit"]
  P -.-> ST["/strava (OAuth)"]
```

Admin-only routes live under `/godaddy/*` (analytics, users, interests, design-system).

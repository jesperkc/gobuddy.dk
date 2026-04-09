# GoBuddy

**Site name:** GoBuddy  
**Domain:** gobuddy.dk  
**Language:** Danish (UI), English (code)  
**Purpose:** Social platform for Danes to find friends through shared hobbies and interests.

---

## Pages

### Public (unauthenticated)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | Hero split-screen introducing GoBuddy. CTA to start signup or log in. |
| `/login` | Log ind | Email/password login form. |
| `/details` | Onboarding — Details | First signup step: name, age, bio. |
| `/interests` | Onboarding — Interests | Second step: pick hobbies/interests from categorized list. |
| `/location` | Onboarding — Location | Third step: share location via geolocation or manual search. |
| `/signup` | Onboarding — Signup | Final step: create account with email/password. |
| `/confirmemail` | Email bekræftelse | Waiting screen after signup, prompts user to confirm email. |
| `/complete` | Profil færdig | Post-confirmation completion step. |
| `/completed` | Velkommen | Success screen after onboarding is fully done. |
| `/interesser` | Interesser oversigt | Public browse page listing all available interests. |
| `/interesser/:slug` | Interesse detalje | Public page for a single interest with description and related interests. |

### Authenticated (logged-in users)

| Route | Page | Purpose |
|-------|------|---------|
| `/home` | Hjem | Dashboard showing nearby buddies, upcoming activities, and quick actions. |
| `/discover` | Opdag | Browse and search all buddies, sorted by shared interests or newest. Filter and paginate. |
| `/profile` | Min profil | View own profile: interests, non-interests, account details. |
| `/profile-edit` | Rediger profil | Edit name, bio, interests, location, and profile details. |
| `/buddy/:slug` | Buddy profil | View another user's profile with shared/related interest matching and Hi5 interaction. |
| `/chat` | Beskeder | Chat inbox listing active conversations. |
| `/chat/:buddyId` | Chat samtale | 1-on-1 messaging thread with a buddy. |
| `/aktiviteter` | Aktiviteter | Browse all upcoming activities/events. |
| `/aktiviteter/opret` | Opret aktivitet | Create a new activity with title, description, date, location, and interest tags. |
| `/aktiviteter/:slug` | Aktivitet detalje | View activity details, participants, and join/leave. |
| `/aktiviteter/:slug/rediger` | Rediger aktivitet | Edit an existing activity (creator only). |

### Admin (`/godaddy/*` — role-protected)

| Route | Page | Purpose |
|-------|------|---------|
| `/godaddy` | Admin dashboard | Overview stats: user count, interest count, activity metrics. |
| `/godaddy/users` | Brugere | List, search, and filter all users. |
| `/godaddy/users/create` | Opret bruger | Manually create a user account. |
| `/godaddy/users/generate` | Generer brugere | Bulk-generate test users. |
| `/godaddy/users/:userId/edit` | Rediger bruger | Edit a specific user's profile and role. |
| `/godaddy/interests` | Interesser | List, search, and manage all interests. |
| `/godaddy/interests/create` | Opret interesse | Add a new interest to the system. |
| `/godaddy/interests/generate` | Generer interesser | Bulk-generate interests. |
| `/godaddy/interests/relations` | Interesse-relationer | Manage relatedness scores between interest pairs. |
| `/godaddy/analytics` | Analytik | Usage analytics and growth charts. |

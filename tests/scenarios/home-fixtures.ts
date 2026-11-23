import type { Page } from "@playwright/test";

/**
 * Fixtures for rendering /home in a chosen state without a real database.
 * Supabase REST calls are answered from the data below; everything else about
 * the page (components, store logic, routing) is the real app.
 */

export const ME_ID = "aaaaaaaa-0000-0000-0000-000000000001";

const CORS = { "access-control-allow-origin": "*", "content-type": "application/json" };

export const INTERESTS = {
  run: { interest_id: "11111111-1111-1111-1111-111111111111", interest_da: "Løb", interest_en: "Running", icon: "run", onboarding: true, category: "sport" },
  bike: { interest_id: "22222222-2222-2222-2222-222222222222", interest_da: "Cykling", interest_en: "Cycling", icon: "bike", onboarding: true, category: "sport" },
  tennis: { interest_id: "33333333-3333-3333-3333-333333333333", interest_da: "Tennis", interest_en: "Tennis", icon: "tennis", onboarding: true, category: "sport" },
} as const;
type InterestKey = keyof typeof INTERESTS;

/** Copenhagen. The viewer lives here in every scenario that has a location. */
export const HOME = { lat: 55.6761, lng: 12.5683 };
/** Roskilde, ~30 km away: inside the 50 km "nearby" radius. */
export const NEAR = { lat: 55.642, lng: 12.0803 };
/** Aarhus, ~155 km away: outside the radius. */
export const FAR = { lat: 56.1629, lng: 10.2039 };

export interface Scenario {
  /** Short stable id, used for file names. */
  id: string;
  title: string;
  /** One line: what is being tested. */
  why: string;
  /** Has the email been verified? */
  verified: boolean;
  bio: "none" | "written" | "skipped";
  /** Interests the viewer picked. Empty = none chosen. */
  interests: InterestKey[];
  hasLocation: boolean;
  /** Other users in the database. */
  buddies: Array<{ name: string; where: "near" | "far" | "unknown"; interests: InterestKey[] }>;
  /** Viewer already said hi to the first buddy. */
  hi5Sent: boolean;
  /** Interests the viewer already posted about. */
  postedAbout: InterestKey[];
  /**
   * What we believe the page should show. Checked by the spec, so a wrong
   * belief (or a regression) shows up as a failing scenario.
   */
  expect: Blocks;
  /** Set when the (correct) behavior is worth a second look. Flagged in the generated diagram. */
  surprising?: string;
}

/** The distinct blocks the page can show. true = visible, false = absent. */
export interface Blocks {
  verifyBanner: boolean;
  bioPrompt: boolean;
  firstPostPrompt: boolean;
  bestMatch: boolean;
  noNearby: boolean;
  checklist: boolean;
}

export const BLOCK_LABELS: Record<keyof Blocks, string> = {
  verifyBanner: "Bekræft-email banner",
  bioPrompt: "BioPrompt",
  firstPostPrompt: "FirstPostPrompt",
  bestMatch: "BestMatchCard",
  noNearby: "NoNearbyBuddies",
  checklist: "Profil-tjekliste",
};

function fakeJwt(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: ME_ID, role: "authenticated", exp: 4102444800 })}.sig`;
}

function profileFor(s: Scenario) {
  const pos = s.hasLocation ? { latitude: HOME.lat, longitude: HOME.lng, city: "København" } : { city: "" };
  return {
    id: ME_ID,
    profile_id: ME_ID,
    first_name: "Maria",
    age: 31,
    email: "maria@example.test",
    coordinates: null,
    postcode: s.hasLocation ? "2100" : "",
    country: "Danmark",
    country_code: "dk",
    avatar_url: null,
    bio: s.bio === "written" ? "Jeg løber om morgenen og cykler i weekenden." : null,
    newsletter: false,
    created_at: "2026-11-01T10:00:00Z",
    ...pos,
    user_interests: s.interests.map((k) => ({
      interest_id: INTERESTS[k].interest_id,
      description: "",
      is_non_interest: false,
      interests: INTERESTS[k],
    })),
  };
}

function buddyRows(s: Scenario) {
  return s.buddies.map((b, i) => {
    const pos = b.where === "near" ? NEAR : b.where === "far" ? FAR : { lat: null, lng: null };
    return {
      profile_id: `bbbbbbbb-0000-0000-0000-00000000000${i + 1}`,
      slug: `${b.name.toLowerCase()}-${i + 1}`,
      first_name: b.name,
      age: 28 + i,
      city: b.where === "near" ? "Roskilde" : b.where === "far" ? "Aarhus" : null,
      latitude: pos.lat,
      longitude: pos.lng,
      avatar_url: null,
      user_interests: b.interests.map((k) => ({
        interest_id: INTERESTS[k].interest_id,
        is_non_interest: false,
        interests: INTERESTS[k],
      })),
    };
  });
}

const json = (body: unknown, status = 200) => ({ status, headers: CORS, body: JSON.stringify(body) });

/** Wire up auth, storage and every Supabase call /home makes for this scenario. */
export async function installScenario(page: Page, s: Scenario) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL must be set (see .env.example)");
  const ref = new URL(supabaseUrl).hostname.split(".")[0];

  const session = {
    access_token: fakeJwt(),
    refresh_token: "fake-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 4102444800,
    user: { id: ME_ID, aud: "authenticated", role: "authenticated", email: "maria@example.test", created_at: "2026-11-01T10:00:00Z", app_metadata: {}, user_metadata: {} },
  };
  const firstPosts =
    s.bio === "skipped"
      ? { state: { userId: ME_ID, drafts: {}, skipped: [], bioSkipped: true, bioSuggestion: null }, version: 0 }
      : null;

  await page.addInitScript(
    ({ ref, session, firstPosts }) => {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
      if (firstPosts) localStorage.setItem("gobuddy-first-posts", JSON.stringify(firstPosts));
      // "first_home_view" is tracked once per browser; keep each run identical.
      localStorage.setItem("gobuddy-tracked-first_home_view", "1");
    },
    { ref, session, firstPosts },
  );

  // Catch-all first (Playwright runs the most recently added matching handler first).
  await page.route("**/rest/v1/**", (route) =>
    route.request().method() === "GET" ? route.fulfill(json([])) : route.fulfill({ status: 201, headers: CORS, body: "" }),
  );
  await page.route("**/rest/v1/rpc/get_full_profile**", (route) => route.fulfill(json(profileFor(s))));
  await page.route("**/rest/v1/email_verifications**", (route) => route.fulfill(json(s.verified ? [{ user_id: ME_ID }] : [])));
  await page.route("**/rest/v1/profiles**", (route) => (route.request().method() === "GET" ? route.fulfill(json(buddyRows(s))) : route.fulfill({ status: 204, headers: CORS, body: "" })));
  await page.route("**/rest/v1/hi5s**", (route) =>
    route.request().method() === "GET"
      ? route.fulfill(json(s.hi5Sent && s.buddies.length ? [{ receiver_id: buddyRows(s)[0].profile_id }] : []))
      : route.fulfill({ status: 201, headers: CORS, body: "" }),
  );
  await page.route("**/rest/v1/activity_posts**", (route) => {
    const url = route.request().url();
    // FirstPostPrompt asks "which interests have I posted about?"; the feed asks for everyone's.
    if (url.includes("profile_id=eq.")) return route.fulfill(json(s.postedAbout.map((k) => ({ interest_id: INTERESTS[k].interest_id }))));
    return route.fulfill(json([]));
  });
  // Deterministic bio suggestion so screenshots don't change between runs.
  await page.route("**/functions/v1/suggest-bio**", (route) => route.fulfill(json({ bio: "Jeg elsker at komme ud og være aktiv, og leder efter nogen at lave det sammen med." })));
  // Browser geolocation: deny quietly so useLocationUpdate does nothing.
  await page.route("**nominatim.openstreetmap.org/**", (route) => route.fulfill(json({})));
}

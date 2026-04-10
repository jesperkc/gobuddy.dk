// Strava OAuth 2.0 and API utilities

// ── Types ──────────────────────────────────────────────────────────

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  username: string | null;
  firstname: string;
  lastname: string;
  city: string | null;
  state: string | null;
  country: string | null;
  sex: "M" | "F" | null;
  profile: string; // avatar URL
  profile_medium: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  type: string;
  distance: number; // metres
  moving_time: number; // seconds
  elapsed_time: number;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  total_elevation_gain: number;
}

export interface StravaStats {
  biggest_ride_distance: number | null;
  biggest_climb_elevation_gain: number | null;
  recent_ride_totals: StravaTotals;
  recent_run_totals: StravaTotals;
  recent_swim_totals: StravaTotals;
  ytd_ride_totals: StravaTotals;
  ytd_run_totals: StravaTotals;
  ytd_swim_totals: StravaTotals;
  all_ride_totals: StravaTotals;
  all_run_totals: StravaTotals;
  all_swim_totals: StravaTotals;
}

export interface StravaTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
}

// ── Local type for DB row (avoids codegen dependency) ──────────────

export interface StravaConnection {
  id: string;
  profile_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  athlete_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── OAuth helpers ──────────────────────────────────────────────────

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_DEAUTH_URL = "https://www.strava.com/oauth/deauthorize";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

/**
 * Build the Strava OAuth authorize URL.
 * Safe to call on the client (uses VITE_ env vars only).
 * Encodes the user's profile_id in the `state` param so the callback knows who to link.
 */
export function buildStravaAuthUrl(profileId: string): string {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const appUrl = import.meta.env.VITE_APP_URL || "http://localhost:3002";
  const redirectUri = `${appUrl}/strava/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state: profileId,
  });

  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens. SERVER-SIDE ONLY.
 */
export async function exchangeStravaCode(
  code: string
): Promise<StravaTokenResponse> {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token. SERVER-SIDE ONLY.
 */
export async function refreshStravaToken(
  refreshToken: string
): Promise<StravaTokenResponse> {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava token refresh failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Deauthorize (revoke) a Strava access token. SERVER-SIDE ONLY.
 */
export async function deauthorizeStrava(
  accessToken: string
): Promise<void> {
  const res = await fetch(STRAVA_DEAUTH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava deauthorize failed (${res.status}): ${body}`);
  }
}

// ── API calls (use valid access token) ─────────────────────────────

/**
 * Fetch the authenticated athlete's stats.
 */
export async function fetchAthleteStats(
  accessToken: string,
  athleteId: number
): Promise<StravaStats> {
  const res = await fetch(
    `${STRAVA_API_BASE}/athletes/${athleteId}/stats`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Strava stats fetch failed (${res.status})`);
  }

  return res.json();
}

/**
 * Fetch the athlete's recent activities.
 */
export async function fetchRecentActivities(
  accessToken: string,
  perPage = 200
): Promise<StravaActivity[]> {
  const res = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Strava activities fetch failed (${res.status})`);
  }

  return res.json();
}

// ── Strava sport_type → GoBuddy interest mapping ──────────────────

/**
 * Maps Strava sport types to Danish interest keywords.
 * Used to match against the `interests` table's `interest_da` column.
 */
export const STRAVA_SPORT_MAP: Record<string, string> = {
  // Running
  Run: "Løb",
  TrailRun: "Løb",
  VirtualRun: "Løb",
  // Cycling
  Ride: "Cykling",
  EBikeRide: "Cykling",
  VirtualRide: "Cykling",
  GravelRide: "Gravelcykling",
  MountainBikeRide: "Mountainbiking",
  // Water
  Swim: "Svømning",
  Rowing: "Roning",
  Canoe: "Kano",
  Kayaking: "Kajakroning",
  StandUpPaddling: "Stand Up Paddle",
  Surfing: "Surfing",
  Kitesurf: "Kitesurfing",
  Windsurf: "Windsurfing",
  // Winter
  AlpineSki: "Skiløb",
  BackcountrySki: "Off-piste skiløb",
  NordicSki: "Langrend",
  Snowboard: "Snowboard",
  Snowshoe: "Vandring",
  IceSkate: "Skøjteløb",
  // Ball sports
  Soccer: "Fodbold",
  Tennis: "Tennis",
  Badminton: "Badminton",
  Squash: "Squash",
  TableTennis: "Bordtennis",
  Pickleball: "Padel Tennis",
  // Fitness & other
  Walk: "Vandring",
  Hike: "Vandring",
  Yoga: "Yoga",
  WeightTraining: "Styrketræning",
  Workout: "Fitness",
  Crossfit: "CrossFit",
  RockClimbing: "Klatring",
  Golf: "Golf",
  InlineSkate: "Rulleskøjteløb",
  Skateboard: "Skateboarding",
};

/**
 * Extract unique sport types from a list of activities and return
 * their Danish equivalents (for matching against interests table).
 */
export function mapActivitiesToInterests(
  activities: StravaActivity[]
): string[] {
  const sportTypes = new Set(activities.map((a) => a.sport_type));
  const danishInterests = new Set<string>();

  for (const sport of sportTypes) {
    const mapped = STRAVA_SPORT_MAP[sport];
    if (mapped) danishInterests.add(mapped);
  }

  return Array.from(danishInterests);
}

export interface SportStats {
  label: string;
  count: number;
  distance: number;
  movingTime: number;
  elevationGain: number;
}

/**
 * Compute per-sport stats from a list of activities, grouped by Danish interest name.
 * Sorted by count descending.
 */
export function computeSportStats(activities: StravaActivity[]): SportStats[] {
  const statsMap = new Map<string, SportStats>();

  for (const a of activities) {
    const label = STRAVA_SPORT_MAP[a.sport_type] || a.sport_type;
    const existing = statsMap.get(label) || {
      label,
      count: 0,
      distance: 0,
      movingTime: 0,
      elevationGain: 0,
    };

    existing.count++;
    existing.distance += a.distance || 0;
    existing.movingTime += a.moving_time || 0;
    existing.elevationGain += a.total_elevation_gain || 0;

    statsMap.set(label, existing);
  }

  return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
}

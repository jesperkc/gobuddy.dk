// Strava Webhook — Supabase Edge Function
//
// GET  → Strava subscription validation (hub.challenge)
// POST → Incoming activity events (create / update / delete)
//
// Deploy: supabase functions deploy strava-webhook --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ── Env ────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SECRET_KEY = Deno.env.get("SB_SECRET_KEY")!;
const STRAVA_CLIENT_ID = Deno.env.get("VITE_STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const STRAVA_WEBHOOK_VERIFY_TOKEN = Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN") || "gobuddy-strava-verify";

const supabaseAdmin = createClient(SUPABASE_URL, SB_SECRET_KEY);

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// ── Strava sport_type → GoBuddy interest mapping ──────────────────

const STRAVA_SPORT_MAP: Record<string, string> = {
  Run: "Løb", TrailRun: "Løb", VirtualRun: "Løb",
  Ride: "Cykling", EBikeRide: "Cykling", VirtualRide: "Cykling",
  GravelRide: "Gravelcykling", MountainBikeRide: "Mountainbiking",
  Swim: "Svømning", Rowing: "Roning", Canoe: "Kano",
  Kayaking: "Kajakroning", StandUpPaddling: "Stand Up Paddle",
  Surfing: "Surfing", Kitesurf: "Kitesurfing", Windsurf: "Windsurfing",
  AlpineSki: "Skiløb", BackcountrySki: "Off-piste skiløb",
  NordicSki: "Langrend", Snowboard: "Snowboard",
  Snowshoe: "Vandring", IceSkate: "Skøjteløb",
  Soccer: "Fodbold", Tennis: "Tennis", Badminton: "Badminton",
  Squash: "Squash", TableTennis: "Bordtennis", Pickleball: "Padel Tennis",
  Walk: "Vandring", Hike: "Vandring", Yoga: "Yoga",
  WeightTraining: "Styrketræning", Workout: "Fitness", Crossfit: "CrossFit",
  RockClimbing: "Klatring", Golf: "Golf",
  InlineSkate: "Rulleskøjteløb", Skateboard: "Skateboarding",
};

// ── Types ──────────────────────────────────────────────────────────

interface StravaWebhookEvent {
  aspect_type: "create" | "update" | "delete";
  event_time: number;
  object_id: number;
  object_type: "activity" | "athlete";
  owner_id: number; // Strava athlete ID
  subscription_id: number;
  updates: Record<string, unknown>;
}

interface StravaConnection {
  id: string;
  profile_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────

async function getValidAccessToken(conn: StravaConnection): Promise<string> {
  const expiresAt = new Date(conn.token_expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) return conn.access_token;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();

  await supabaseAdmin
    .from("strava_connections")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(data.expires_at * 1000).toISOString(),
    })
    .eq("id", conn.id);

  return data.access_token;
}

async function resolveInterestId(sportType: string): Promise<string | null> {
  const danishName = STRAVA_SPORT_MAP[sportType];
  if (!danishName) return null;

  const { data } = await supabaseAdmin
    .from("interests")
    .select("interest_id")
    .ilike("interest_da", danishName)
    .limit(1)
    .single();

  return data?.interest_id ?? null;
}

function formatDistance(metres: number): string {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}t ${m}m` : `${m} min`;
}

// ── Activity import ────────────────────────────────────────────────

async function importActivity(
  profileId: string,
  accessToken: string,
  stravaActivityId: number
): Promise<void> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${stravaActivityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Activity fetch failed: ${res.status}`);
  const activity = await res.json();

  const interestId = await resolveInterestId(activity.sport_type);

  const descParts: string[] = [];
  if (activity.distance > 0) descParts.push(formatDistance(activity.distance));
  if (activity.moving_time > 0) descParts.push(formatDuration(activity.moving_time));
  if (activity.total_elevation_gain > 0) descParts.push(`↑ ${Math.round(activity.total_elevation_gain)} m`);

  const isPrivate = activity.visibility !== "everyone";

  const { data: post, error } = await supabaseAdmin
    .from("activity_posts")
    .upsert(
      {
        profile_id: profileId,
        interest_id: interestId,
        title: activity.name,
        description: descParts.join(" · "),
        source: "strava",
        source_id: String(activity.id),
        source_url: `https://www.strava.com/activities/${activity.id}`,
        source_data: activity,
        activity_date: activity.start_date,
        private: isPrivate,
      },
      { onConflict: "source,source_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`Upsert failed: ${error.message}`);

  // Import photos (best effort)
  try {
    const photosRes = await fetch(
      `${STRAVA_API_BASE}/activities/${stravaActivityId}/photos?size=600`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (photosRes.ok) {
      const photos = await photosRes.json();
      if (photos.length > 0) {
        // Clear existing Strava photos for this post
        await supabaseAdmin
          .from("activity_post_media")
          .delete()
          .eq("post_id", post.id)
          .eq("source", "strava");

        const rows = photos
          .map((p: Record<string, Record<string, string>>, i: number) => ({
            post_id: post.id,
            url: p.urls?.["600"] || p.urls?.["100"] || Object.values(p.urls || {})[0] || "",
            media_type: "image",
            source: "strava",
            sort_order: i,
          }))
          .filter((r: { url: string }) => r.url);

        if (rows.length > 0) {
          await supabaseAdmin.from("activity_post_media").insert(rows);
        }
      }
    }
  } catch (photoErr) {
    console.warn(`Photo import failed for activity ${stravaActivityId}:`, photoErr);
  }
}

async function deleteActivity(stravaActivityId: number): Promise<void> {
  await supabaseAdmin
    .from("activity_posts")
    .delete()
    .eq("source", "strava")
    .eq("source_id", String(stravaActivityId));
}

// ── Main handler ───────────────────────────────────────────────────

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // GET → Subscription validation
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === STRAVA_WEBHOOK_VERIFY_TOKEN) {
      return new Response(JSON.stringify({ "hub.challenge": challenge }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // POST → Incoming event
  if (req.method === "POST") {
    try {
      const event: StravaWebhookEvent = await req.json();
      console.log("Strava webhook event:", JSON.stringify(event));

      // Only handle activity events
      if (event.object_type !== "activity") {
        return new Response("OK", { status: 200 });
      }

      // Find the user's Strava connection
      const { data: conn } = await supabaseAdmin
        .from("strava_connections")
        .select("*")
        .eq("strava_athlete_id", event.owner_id)
        .single();

      if (!conn) {
        console.warn(`No connection found for Strava athlete ${event.owner_id}`);
        return new Response("OK", { status: 200 });
      }

      const connection = conn as unknown as StravaConnection;

      if (event.aspect_type === "delete") {
        await deleteActivity(event.object_id);
      } else {
        // create or update
        const accessToken = await getValidAccessToken(connection);
        await importActivity(connection.profile_id, accessToken, event.object_id);
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Webhook processing error:", err);
      // Return 200 to prevent Strava from retrying (we log the error)
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

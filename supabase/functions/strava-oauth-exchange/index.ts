// Exchange a Strava OAuth `code` for tokens, store the connection, and
// best-effort import recent activities. The Strava client secret never leaves
// this function.
//
// Caller must be authenticated. The `profile_id` in the body must match the
// authenticated user's id — preventing a user from linking Strava to another
// user's profile.
//
// Deploy: supabase functions deploy strava-oauth-exchange

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, env, json } from "../_shared/admin-auth.ts";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const MAX_INITIAL_IMPORT = 50;

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

interface ExchangeBody {
  code: string;
  profile_id: string;
}

function formatDistance(metres: number): string {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}t ${m}m` : `${m} min`;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "POST required" });

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Missing Authorization header" });
    }
    const userClient = createClient(env("SUPABASE_URL"), env("SB_PUBLISHABLE_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Invalid token" });

    let body: ExchangeBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }
    if (!body.code || !body.profile_id) {
      return json(400, { error: "code and profile_id are required" });
    }
    if (body.profile_id !== userData.user.id) {
      return json(403, { error: "profile_id does not match the authenticated user" });
    }

    // Exchange the code with Strava
    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env("VITE_STRAVA_CLIENT_ID"),
        client_secret: env("STRAVA_CLIENT_SECRET"),
        code: body.code,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return json(400, { error: `Strava token exchange failed (${tokenRes.status})`, detail: detail.slice(0, 300) });
    }
    const tokenData = await tokenRes.json();

    const athleteData = {
      id: tokenData.athlete.id,
      username: tokenData.athlete.username,
      firstname: tokenData.athlete.firstname,
      lastname: tokenData.athlete.lastname,
      city: tokenData.athlete.city,
      country: tokenData.athlete.country,
      profile: tokenData.athlete.profile,
      profile_medium: tokenData.athlete.profile_medium,
    };

    const admin = createClient(env("SUPABASE_URL"), env("SB_SECRET_KEY"));

    // Verify the profile exists (so we don't write a dangling connection)
    const { data: profileExists } = await admin
      .from("profiles")
      .select("profile_id")
      .eq("profile_id", body.profile_id)
      .single();
    if (!profileExists) return json(404, { error: "Profile not found" });

    const { error: upsertError } = await admin
      .from("strava_connections")
      .upsert(
        {
          profile_id: body.profile_id,
          strava_athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
          athlete_data: athleteData,
        },
        { onConflict: "profile_id" }
      );
    if (upsertError) return json(500, { error: `storage_failed: ${upsertError.message}` });

    // Best-effort initial activity import. Bounded so we don't blow the edge
    // function's wall-clock budget on busy athletes.
    let imported = 0;
    let importErrors = 0;
    try {
      const actsRes = await fetch(
        `${STRAVA_API_BASE}/athlete/activities?per_page=${MAX_INITIAL_IMPORT}`,
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      if (actsRes.ok) {
        const activities = await actsRes.json() as Array<{
          id: number;
          name: string;
          sport_type: string;
          distance: number;
          moving_time: number;
          total_elevation_gain: number;
          start_date: string;
          visibility?: string;
        }>;
        const interestCache = new Map<string, string>();
        const { data: interests } = await admin
          .from("interests")
          .select("interest_id, interest_da");
        if (interests) {
          for (const i of interests) interestCache.set(i.interest_da.toLowerCase(), i.interest_id);
        }

        for (const activity of activities) {
          try {
            const danish = STRAVA_SPORT_MAP[activity.sport_type];
            const interestId = danish ? interestCache.get(danish.toLowerCase()) ?? null : null;
            const descParts: string[] = [];
            if (activity.distance > 0) descParts.push(formatDistance(activity.distance));
            if (activity.moving_time > 0) descParts.push(formatDuration(activity.moving_time));
            if (activity.total_elevation_gain > 0)
              descParts.push(`↑ ${Math.round(activity.total_elevation_gain)} m`);

            const { error } = await admin.from("activity_posts").upsert(
              {
                profile_id: body.profile_id,
                interest_id: interestId,
                title: activity.name,
                description: descParts.join(" · "),
                source: "strava",
                source_id: String(activity.id),
                source_url: `https://www.strava.com/activities/${activity.id}`,
                source_data: activity,
                activity_date: activity.start_date,
                private: activity.visibility !== "everyone",
              },
              { onConflict: "source,source_id" }
            );
            if (error) importErrors++;
            else imported++;
          } catch {
            importErrors++;
          }
        }
      }
    } catch (e) {
      console.warn("Initial import failed:", e);
    }

    return json(200, { ok: true, imported, import_errors: importErrors });
  } catch (e) {
    console.error("strava-oauth-exchange fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

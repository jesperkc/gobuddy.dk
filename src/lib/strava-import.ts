// Strava → GoBuddy activity post import service (SERVER-SIDE ONLY)
//
// Fetches activities from Strava, maps them to activity_posts, and persists
// them in Supabase. Designed to be called from server loaders and webhook handlers.

import { supabaseAdmin } from "./supabase";
import {
  refreshStravaToken,
  fetchRecentActivities,
  STRAVA_SPORT_MAP,
  type StravaActivity,
  type StravaConnection,
} from "./strava";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// ── Types ──────────────────────────────────────────────────────────

interface StravaDetailedActivity extends StravaActivity {
  description: string | null;
  photos?: {
    primary?: {
      urls?: Record<string, string>;
    };
    count: number;
  };
}

interface StravaPhoto {
  unique_id: string;
  urls: Record<string, string>;
  caption: string | null;
}

// ── Token helpers ──────────────────────────────────────────────────

/**
 * Get a valid access token for a Strava connection, refreshing if expired.
 * Updates the stored tokens in the database when refreshed.
 */
export async function getValidAccessToken(
  connection: StravaConnection
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const now = Date.now();

  // Token still valid (with 60s buffer)
  if (expiresAt > now + 60_000) {
    return connection.access_token;
  }

  // Refresh the token
  const tokenData = await refreshStravaToken(connection.refresh_token);

  // Update stored tokens
  await supabaseAdmin
    .from("strava_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return tokenData.access_token;
}

// ── Interest resolution ────────────────────────────────────────────

/** Cache of interest_da → interest_id, loaded once per process */
let interestCache: Map<string, string> | null = null;

async function getInterestIdByDanishName(
  nameDa: string
): Promise<string | null> {
  if (!interestCache) {
    const { data } = await supabaseAdmin
      .from("interests")
      .select("interest_id, interest_da");

    interestCache = new Map();
    if (data) {
      for (const row of data) {
        interestCache.set(row.interest_da.toLowerCase(), row.interest_id);
      }
    }
  }

  return interestCache.get(nameDa.toLowerCase()) ?? null;
}

/**
 * Resolve Strava sport_type to a GoBuddy interest_id.
 */
async function resolveInterestId(
  sportType: string
): Promise<string | null> {
  const danishName = STRAVA_SPORT_MAP[sportType];
  if (!danishName) return null;
  return getInterestIdByDanishName(danishName);
}

// ── Strava API helpers ─────────────────────────────────────────────

async function fetchActivityDetail(
  accessToken: string,
  activityId: number
): Promise<StravaDetailedActivity> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(
      `Strava activity detail fetch failed (${res.status})`
    );
  }

  return res.json();
}

async function fetchActivityPhotos(
  accessToken: string,
  activityId: number,
  size = 600
): Promise<StravaPhoto[]> {
  const res = await fetch(
    `${STRAVA_API_BASE}/activities/${activityId}/photos?size=${size}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];
  return res.json();
}

// ── Activity → Post mapping ────────────────────────────────────────

function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}t ${m}m`;
  return `${m} min`;
}

function buildDescription(activity: StravaActivity): string {
  const parts: string[] = [];

  if (activity.distance > 0) {
    parts.push(formatDistance(activity.distance));
  }
  if (activity.moving_time > 0) {
    parts.push(formatDuration(activity.moving_time));
  }
  if (activity.total_elevation_gain > 0) {
    parts.push(`↑ ${Math.round(activity.total_elevation_gain)} m`);
  }

  return parts.join(" · ");
}

// ── Main import functions ──────────────────────────────────────────

/**
 * Import recent Strava activities for a user.
 * Called on initial connect and can be called for manual refresh.
 */
export async function importStravaActivities(
  profileId: string,
  accessToken: string,
  _athleteId: number,
  maxActivities = 200
): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;

  try {
    const activities = await fetchRecentActivities(
      accessToken,
      maxActivities
    );

    for (const activity of activities) {
      try {
        await upsertActivityPost(profileId, accessToken, activity);
        imported++;
      } catch (err) {
        console.error(
          `Failed to import Strava activity ${activity.id}:`,
          err
        );
        errors++;
      }
    }
  } catch (err) {
    console.error("Failed to fetch Strava activities:", err);
    errors++;
  }

  return { imported, errors };
}

/**
 * Import (or update) a single Strava activity by ID.
 * Used by the webhook handler.
 */
export async function importSingleStravaActivity(
  profileId: string,
  accessToken: string,
  stravaActivityId: number
): Promise<void> {
  const detail = await fetchActivityDetail(accessToken, stravaActivityId);
  await upsertActivityPost(profileId, accessToken, detail);
}

/**
 * Delete a Strava-imported post by its Strava activity ID.
 * Used by the webhook handler for delete events.
 */
export async function deleteStravaActivityPost(
  stravaActivityId: number
): Promise<void> {
  await supabaseAdmin
    .from("activity_posts")
    .delete()
    .eq("source", "strava")
    .eq("source_id", String(stravaActivityId));
}

// ── Internal helpers ───────────────────────────────────────────────

async function upsertActivityPost(
  profileId: string,
  accessToken: string,
  activity: StravaActivity
): Promise<void> {
  const interestId = await resolveInterestId(activity.sport_type);

  const stravaUrl = `https://www.strava.com/activities/${activity.id}`;
  const description = buildDescription(activity);
  const isPrivate = activity.visibility !== "everyone";

  const { data: post, error } = await supabaseAdmin
    .from("activity_posts")
    .upsert(
      {
        profile_id: profileId,
        interest_id: interestId,
        title: activity.name,
        description,
        source: "strava",
        source_id: String(activity.id),
        source_url: stravaUrl,
        source_data: activity as unknown as Record<string, unknown>,
        activity_date: activity.start_date,
        private: isPrivate,
      },
      { onConflict: "source,source_id" }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Upsert activity_posts failed: ${error.message}`);
  }

  // Import photos (best effort)
  try {
    await importActivityPhotos(accessToken, activity.id, post.id);
  } catch (err) {
    console.warn(
      `Failed to import photos for activity ${activity.id}:`,
      err
    );
  }
}

async function importActivityPhotos(
  accessToken: string,
  stravaActivityId: number,
  postId: string
): Promise<void> {
  const photos = await fetchActivityPhotos(accessToken, stravaActivityId);
  if (photos.length === 0) return;

  // Delete existing Strava photos for this post (in case of update)
  await supabaseAdmin
    .from("activity_post_media")
    .delete()
    .eq("post_id", postId)
    .eq("source", "strava");

  const rows = photos.map((photo, i) => {
    // Pick the largest available URL
    const url =
      photo.urls?.["600"] ||
      photo.urls?.["100"] ||
      Object.values(photo.urls || {})[0];

    return {
      post_id: postId,
      url: url || "",
      media_type: "image" as const,
      source: "strava" as const,
      sort_order: i,
    };
  }).filter((r) => r.url);

  if (rows.length > 0) {
    await supabaseAdmin.from("activity_post_media").insert(rows);
  }
}

// Permanently delete one user and everything that belongs to them. Shared by
// the admin delete functions and the self-service delete-account function.
//
// Most user data (events, RSVPs, posts, likes, comments, follows, hi5s, Strava
// connection) cascades from profiles / auth.users. What doesn't cascade is
// removed explicitly: messages, interests, roles, avatar files — and the Strava
// app authorization is revoked on Strava's side before the tokens are dropped.
//
// Best-effort steps collect warnings; only a failed profile delete aborts.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const STRAVA_DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize";

export type DeleteUserResult = { ok: true; warnings: string[] } | { ok: false; error: string; warnings: string[] };

export async function deleteUserCompletely(admin: SupabaseClient, id: string): Promise<DeleteUserResult> {
  const warnings: string[] = [];

  // Revoke GoBuddy's access on Strava while we still hold a token.
  const { data: strava } = await admin.from("strava_connections").select("access_token").eq("profile_id", id).maybeSingle();
  if (strava?.access_token) {
    try {
      const res = await fetch(STRAVA_DEAUTHORIZE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${strava.access_token}` },
      });
      if (!res.ok) warnings.push(`strava deauthorize: HTTP ${res.status}`);
    } catch (e) {
      warnings.push(`strava deauthorize: ${e instanceof Error ? e.message : "request failed"}`);
    }
  }

  // Avatar files live under avatars/<user id>/.
  const { data: avatarFiles, error: listErr } = await admin.storage.from("avatars").list(id);
  if (listErr) warnings.push(`avatars list: ${listErr.message}`);
  if (avatarFiles?.length) {
    const { error } = await admin.storage.from("avatars").remove(avatarFiles.map((f) => `${id}/${f.name}`));
    if (error) warnings.push(`avatars remove: ${error.message}`);
  }

  const messagesErr = (await admin.from("messages").delete().or(`sender_id.eq.${id},receiver_id.eq.${id}`)).error;
  if (messagesErr) warnings.push(`messages: ${messagesErr.message}`);

  const interestsErr = (await admin.from("user_interests").delete().eq("profile_id", id)).error;
  if (interestsErr) warnings.push(`user_interests: ${interestsErr.message}`);

  const rolesErr = (await admin.from("user_roles").delete().eq("user_id", id)).error;
  if (rolesErr) warnings.push(`user_roles: ${rolesErr.message}`);

  const profilesErr = (await admin.from("profiles").delete().eq("profile_id", id)).error;
  if (profilesErr) return { ok: false, error: `profiles delete failed: ${profilesErr.message}`, warnings };

  const { error: authErr } = await admin.auth.admin.deleteUser(id);
  if (authErr) warnings.push(`auth.users: ${authErr.message}`);

  return { ok: true, warnings };
}

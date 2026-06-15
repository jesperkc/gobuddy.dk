// Admin-only: cascade-delete N users in one call. Used by the bulk-delete
// action in /godaddy/users.
//
// Deploy: supabase functions deploy admin-bulk-delete-users

import { corsHeaders, json, requireAdmin } from "../_shared/admin-auth.ts";

interface BulkDeleteBody {
  user_ids: string[];
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "POST required" });

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;
    const { admin } = auth;

    let body: BulkDeleteBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }
    if (!Array.isArray(body.user_ids) || body.user_ids.length === 0) {
      return json(400, { error: "user_ids must be a non-empty array" });
    }
    const ids = body.user_ids;

    const warnings: string[] = [];

    const messagesErr = (
      await admin
        .from("messages")
        .delete()
        .or(ids.map((id) => `sender_id.eq.${id},receiver_id.eq.${id}`).join(","))
    ).error;
    if (messagesErr) warnings.push(`messages: ${messagesErr.message}`);

    const interestsErr = (await admin.from("user_interests").delete().in("profile_id", ids)).error;
    if (interestsErr) warnings.push(`user_interests: ${interestsErr.message}`);

    const rolesErr = (await admin.from("user_roles").delete().in("user_id", ids)).error;
    if (rolesErr) warnings.push(`user_roles: ${rolesErr.message}`);

    const profilesErr = (await admin.from("profiles").delete().in("profile_id", ids)).error;
    if (profilesErr) return json(500, { error: `profiles delete failed: ${profilesErr.message}`, warnings });

    const authFailures: string[] = [];
    for (const id of ids) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) authFailures.push(`${id}: ${error.message}`);
    }
    if (authFailures.length) warnings.push(`auth.users: ${authFailures.join("; ")}`);

    return json(200, { ok: true, deleted_count: ids.length, warnings });
  } catch (e) {
    console.error("admin-bulk-delete-users fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// Admin-only: cascade-delete a single user (messages, user_interests,
// user_roles, profiles, auth.users). Mirrors the previous client-side flow
// in /godaddy/users/$userId/edit.
//
// Deploy: supabase functions deploy admin-delete-user

import { corsHeaders, json, requireAdmin } from "../_shared/admin-auth.ts";

interface DeleteUserBody {
  user_id: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "POST required" });

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;
    const { admin } = auth;

    let body: DeleteUserBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }
    if (!body.user_id) return json(400, { error: "user_id is required" });
    const id = body.user_id;

    const warnings: string[] = [];

    const messagesErr = (await admin.from("messages").delete().or(`sender_id.eq.${id},receiver_id.eq.${id}`)).error;
    if (messagesErr) warnings.push(`messages: ${messagesErr.message}`);

    const interestsErr = (await admin.from("user_interests").delete().eq("profile_id", id)).error;
    if (interestsErr) warnings.push(`user_interests: ${interestsErr.message}`);

    const rolesErr = (await admin.from("user_roles").delete().eq("user_id", id)).error;
    if (rolesErr) warnings.push(`user_roles: ${rolesErr.message}`);

    const profilesErr = (await admin.from("profiles").delete().eq("profile_id", id)).error;
    if (profilesErr) return json(500, { error: `profiles delete failed: ${profilesErr.message}`, warnings });

    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) warnings.push(`auth.users: ${authErr.message}`);

    return json(200, { ok: true, warnings });
  } catch (e) {
    console.error("admin-delete-user fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// Admin-only: cascade-delete a single user (messages, user_interests,
// user_roles, profiles, auth.users). Mirrors the previous client-side flow
// in /godaddy/users/$userId/edit.
//
// Deploy: supabase functions deploy admin-delete-user

import { corsHeaders, json, requireAdmin } from "../_shared/admin-auth.ts";
import { deleteUserCompletely } from "../_shared/delete-user.ts";

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
    const result = await deleteUserCompletely(admin, body.user_id);
    if (!result.ok) return json(500, { error: result.error, warnings: result.warnings });

    return json(200, { ok: true, warnings: result.warnings });
  } catch (e) {
    console.error("admin-delete-user fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

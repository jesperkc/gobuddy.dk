// Admin-only: cascade-delete N users in one call. Used by the bulk-delete
// action in /godaddy/users.
//
// Deploy: supabase functions deploy admin-bulk-delete-users

import { corsHeaders, json, requireAdmin } from "../_shared/admin-auth.ts";
import { deleteUserCompletely } from "../_shared/delete-user.ts";

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
    let deleted = 0;
    for (const id of ids) {
      const result = await deleteUserCompletely(admin, id);
      warnings.push(...result.warnings.map((w) => `${id}: ${w}`));
      if (result.ok) deleted++;
      else warnings.push(`${id}: ${result.error}`);
    }

    return json(200, { ok: true, deleted_count: deleted, warnings });
  } catch (e) {
    console.error("admin-bulk-delete-users fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

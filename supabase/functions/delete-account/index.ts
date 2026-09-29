// Self-service: the signed-in user permanently deletes their own account and
// all their data (GDPR right to erasure). The user id comes from the verified
// JWT, never from the request body, so nobody can delete someone else.
//
// Deploy: supabase functions deploy delete-account

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, env, json } from "../_shared/admin-auth.ts";
import { deleteUserCompletely } from "../_shared/delete-user.ts";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "POST required" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Missing Authorization header" });

    const userClient = createClient(env("SUPABASE_URL"), env("SB_PUBLISHABLE_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Invalid token" });

    const admin = createClient(env("SUPABASE_URL"), env("SB_SECRET_KEY"));
    const result = await deleteUserCompletely(admin, userData.user.id);
    if (!result.ok) {
      console.error("delete-account failed:", result.error, result.warnings);
      return json(500, { error: result.error });
    }
    if (result.warnings.length) console.warn("delete-account warnings:", result.warnings);

    return json(200, { ok: true });
  } catch (e) {
    console.error("delete-account fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

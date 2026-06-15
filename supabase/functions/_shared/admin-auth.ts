// Shared helpers for edge functions that require an admin caller.
//
// Each edge function calls `requireAdmin(req)`; on success it gets back a
// service-role Supabase client to do its privileged work. CORS handling and
// JSON responses are also colocated here so functions stay small.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export type RequireAdminResult =
  | { ok: true; admin: SupabaseClient; userId: string }
  | { ok: false; res: Response };

export async function requireAdmin(req: Request): Promise<RequireAdminResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, res: json(401, { error: "Missing Authorization header" }) };
  }
  const userClient = createClient(env("SUPABASE_URL"), env("SB_PUBLISHABLE_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, res: json(401, { error: "Invalid token" }) };
  }
  const { data: roles, error: rolesErr } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  if (rolesErr) return { ok: false, res: json(500, { error: rolesErr.message }) };
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  if (!isAdmin) return { ok: false, res: json(403, { error: "Admin role required" }) };

  const admin = createClient(env("SUPABASE_URL"), env("SB_SECRET_KEY"));
  return { ok: true, admin, userId: userData.user.id };
}

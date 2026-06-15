// Admin-only: create an auth user with arbitrary metadata. Used by the
// /godaddy/users/generate flow to provision generated test users.
//
// Deploy: supabase functions deploy admin-create-user

import { corsHeaders, json, requireAdmin } from "../_shared/admin-auth.ts";

interface CreateUserBody {
  email: string;
  password: string;
  email_confirm?: boolean;
  user_metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "POST required" });

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    let body: CreateUserBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }
    if (!body.email || !body.password) {
      return json(400, { error: "email and password are required" });
    }

    const { data, error } = await auth.admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: body.email_confirm ?? true,
      user_metadata: body.user_metadata ?? {},
    });
    if (error) return json(400, { error: error.message });
    if (!data.user) return json(500, { error: "User creation returned no user" });

    return json(200, { user_id: data.user.id });
  } catch (e) {
    console.error("admin-create-user fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

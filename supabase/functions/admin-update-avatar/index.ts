// Admin-only: upload or delete the avatar for any user. Used by the
// AvatarEditor in admin context (godaddy/users/$userId/edit). Storage upload
// runs against the service-role client to bypass RLS.
//
// Request: multipart/form-data
//   profile_id: string (required)
//   action:     "upload" | "delete"
//   image:      File (only when action = "upload")
//
// Deploy: supabase functions deploy admin-update-avatar

import { corsHeaders, json, requireAdmin } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "POST required" });

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;
    const { admin } = auth;

    const form = await req.formData();
    const profileId = form.get("profile_id");
    const action = form.get("action");
    if (typeof profileId !== "string" || !profileId) {
      return json(400, { error: "profile_id is required" });
    }
    if (action !== "upload" && action !== "delete") {
      return json(400, { error: "action must be 'upload' or 'delete'" });
    }

    // Clear any existing avatar files for this profile (both flows do this).
    const { data: existing } = await admin.storage.from("avatars").list(profileId);
    if (existing && existing.length > 0) {
      await admin.storage.from("avatars").remove(existing.map((f) => `${profileId}/${f.name}`));
    }

    if (action === "delete") {
      const { error } = await admin.from("profiles").update({ avatar_url: null }).eq("profile_id", profileId);
      if (error) return json(500, { error: error.message });
      return json(200, { avatar_url: null });
    }

    const image = form.get("image");
    if (!(image instanceof File)) return json(400, { error: "image file is required" });

    const filePath = `${profileId}/avatar.webp`;
    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(filePath, image, { upsert: true, contentType: "image/webp" });
    if (uploadError) return json(500, { error: `upload failed: ${uploadError.message}` });

    const { data: urlData } = admin.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("profile_id", profileId);
    if (updateError) return json(500, { error: updateError.message });

    return json(200, { avatar_url: publicUrl });
  } catch (e) {
    console.error("admin-update-avatar fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

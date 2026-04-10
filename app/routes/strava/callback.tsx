import { createFileRoute, redirect } from "@tanstack/react-router";
import { exchangeStravaCode } from "@/lib/strava";
import { supabaseAdmin } from "@/lib/supabase";
import { importStravaActivities } from "@/lib/strava-import";

interface CallbackSearch {
  code?: string;
  error?: string;
  scope?: string;
  state?: string;
}

export const Route = createFileRoute("/strava/callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: search.code as string | undefined,
    error: search.error as string | undefined,
    scope: search.scope as string | undefined,
    state: search.state as string | undefined,
  }),

  loaderDeps: ({ search }) => ({
    code: search.code,
    error: search.error,
    state: search.state,
  }),

  loader: async ({ deps }) => {
    const { code, error, state: profileId } = deps;

    if (error) {
      throw redirect({
        to: "/profile-edit",
        search: { tab: "connections", strava_error: error },
      });
    }

    if (!code || !profileId) {
      throw redirect({
        to: "/profile-edit",
        search: { tab: "connections", strava_error: "no_code" },
      });
    }

    try {
      const tokenData = await exchangeStravaCode(code);

      const athleteData = {
        id: tokenData.athlete.id,
        username: tokenData.athlete.username,
        firstname: tokenData.athlete.firstname,
        lastname: tokenData.athlete.lastname,
        city: tokenData.athlete.city,
        country: tokenData.athlete.country,
        profile: tokenData.athlete.profile,
        profile_medium: tokenData.athlete.profile_medium,
      };

      // Verify the profile exists before storing
      const { data: profileExists } = await supabaseAdmin
        .from("profiles")
        .select("profile_id")
        .eq("profile_id", profileId)
        .single();

      if (!profileExists) {
        throw redirect({
          to: "/profile-edit",
          search: { tab: "connections", strava_error: "invalid_user" },
        });
      }

      // Upsert the connection (update if user reconnects)
      const { error: upsertError } = await supabaseAdmin
        .from("strava_connections")
        .upsert(
          {
            profile_id: profileId,
            strava_athlete_id: tokenData.athlete.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: new Date(
              tokenData.expires_at * 1000
            ).toISOString(),
            athlete_data: athleteData,
          },
          { onConflict: "profile_id" }
        );

      if (upsertError) {
        console.error("Failed to store Strava connection:", upsertError);
        throw redirect({
          to: "/profile-edit",
          search: { tab: "connections", strava_error: "storage_failed" },
        });
      }

      // Auto-import recent activities (best effort — don't block the redirect)
      try {
        const result = await importStravaActivities(
          profileId,
          tokenData.access_token,
          tokenData.athlete.id,
          200
        );
        console.log(
          `Strava auto-import: ${result.imported} imported, ${result.errors} errors`
        );
      } catch (importErr) {
        console.error("Strava auto-import failed:", importErr);
      }

      throw redirect({
        to: "/profile-edit",
        search: { tab: "connections", strava_connected: "true" },
      });
    } catch (err) {
      // Re-throw redirects
      if (
        err instanceof Response ||
        (err as { isRedirect?: boolean })?.isRedirect
      ) {
        throw err;
      }

      console.error("Strava callback error:", err);
      throw redirect({
        to: "/profile-edit",
        search: { tab: "connections", strava_error: "exchange_failed" },
      });
    }
  },

  component: function StravaCallback() {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Forbinder Strava...</span>
      </div>
    );
  },
});

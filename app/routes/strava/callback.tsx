import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useClientEffect } from "@/lib/ssr-utils";

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
  component: StravaCallback,
});

function StravaCallback() {
  const { code, error, state: profileId } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "failed">("working");
  // Strava OAuth codes are single-use. StrictMode double-invokes effects in
  // dev — without this guard the second run hits Strava with a spent code and
  // gets "AuthorizationCode invalid".
  const startedRef = useRef(false);

  useClientEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function run() {
      if (error) {
        return navigate({
          to: "/profile-edit",
          search: { tab: "connections", strava_error: error },
        });
      }
      if (!code || !profileId) {
        return navigate({
          to: "/profile-edit",
          search: { tab: "connections", strava_error: "no_code" },
        });
      }

      // Use raw fetch instead of supabase.functions.invoke so we can read the
      // real error body when the function returns non-2xx (the SDK wraps it
      // and only exposes a generic message).
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        return navigate({
          to: "/profile-edit",
          search: { tab: "connections", strava_error: "not_authenticated" },
        });
      }

      let reason: string | null = null;
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/strava-oauth-exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: publishableKey,
          },
          body: JSON.stringify({ code, profile_id: profileId }),
        });
        const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !body?.ok) {
          reason = body?.error ?? `http_${res.status}`;
        }
      } catch (err) {
        reason = err instanceof Error ? err.message : "network_error";
      }

      if (reason) {
        setStatus("failed");
        return navigate({
          to: "/profile-edit",
          search: { tab: "connections", strava_error: reason.slice(0, 80) },
        });
      }

      navigate({
        to: "/profile-edit",
        search: { tab: "connections", strava_connected: "true" },
      });
    }

    run();
  }, [code, error, profileId, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <span className="ml-3 text-gray-600">
        {status === "working" ? "Forbinder Strava..." : "Kunne ikke forbinde til Strava"}
      </span>
    </div>
  );
}

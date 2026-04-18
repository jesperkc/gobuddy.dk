import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "../../../src/lib/supabase";

// Thin client wrappers around the `generate-relations` Supabase Edge Function.
// The Claude API key never leaves the server.
//
// We invoke the function with a raw fetch (rather than supabase.functions.invoke)
// so we can always read the response body and surface the real server-side
// error message — the SDK wraps non-2xx responses in a FunctionsHttpError whose
// body is awkward to read reliably.

interface GenerateResult {
  count: number;
  error?: string;
  anchorsProcessed?: number;
}

async function invokeEdge(body: Record<string, unknown>): Promise<GenerateResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!supabaseUrl || !anonKey) {
      return { count: 0, error: "Supabase env vars mangler i klienten." };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return { count: 0, error: "Du er ikke logget ind." };
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/generate-relations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let payload: Partial<GenerateResult> = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      return { count: 0, error: `HTTP ${res.status}: ${text.slice(0, 300) || "tomt svar"}` };
    }

    if (!res.ok) {
      return {
        count: payload.count ?? 0,
        error: payload.error ?? `HTTP ${res.status}`,
        anchorsProcessed: payload.anchorsProcessed,
      };
    }
    return {
      count: payload.count ?? 0,
      anchorsProcessed: payload.anchorsProcessed,
    };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : "Ukendt fejl" };
  }
}

export async function generateRelationsForInterest(newInterestId: string): Promise<GenerateResult> {
  return invokeEdge({ mode: "one", interestId: newInterestId });
}

export async function generateRelationsServerSide(): Promise<GenerateResult> {
  return invokeEdge({ mode: "all" });
}

const APIRoute = () => null;

export const Route = createFileRoute("/api/generate-relations")({
  component: APIRoute,
});

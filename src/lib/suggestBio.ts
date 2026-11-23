import { supabase } from "./supabase";

export type BioSuggestion = { bio: string } | { error: "rate_limited" | "unavailable" };

/**
 * Ask the server for an AI-written bio suggestion based on the user's saved
 * interests and city. The server reads those itself; nothing is sent from here.
 */
export async function suggestBio(): Promise<BioSuggestion> {
  const { data, error } = await supabase.functions.invoke<{ bio?: string }>("suggest-bio", { method: "POST" });

  if (error) {
    const status = "context" in error && error.context instanceof Response ? error.context.status : undefined;
    return { error: status === 429 ? "rate_limited" : "unavailable" };
  }
  return data?.bio ? { bio: data.bio } : { error: "unavailable" };
}

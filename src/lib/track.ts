import { supabase } from "./supabase";
import { isBrowser, safeSessionStorage } from "./ssr-utils";

const SESSION_KEY = "gobuddy-session";

/** Random id that lives only as long as the browser tab/session. */
function getSessionId(): string {
  let id = safeSessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    safeSessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Record a funnel event (onboarding step, first hi5, ...). Fire-and-forget: it
 * must never block or break the UI, so all failures are swallowed.
 */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (!isBrowser) return;
  supabase
    .from("funnel_events")
    .insert({ event, props: props ?? null, session_id: getSessionId() })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn("track failed:", error.message);
    });
}

/** Record an event only once per browser (e.g. "first home view"). */
export function trackOnce(event: string, props?: Record<string, string | number | boolean>) {
  if (!isBrowser) return;
  const key = `gobuddy-tracked-${event}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    // storage unavailable — fall through and track anyway
  }
  track(event, props);
}

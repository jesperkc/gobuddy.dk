import { supabase } from "./supabase";
import { track, trackOnce } from "./track";

const HI5_CONTENT = "👋";

/**
 * Send a 👋 message and record the hi5. Throws if the message itself fails;
 * a failed hi5 record is only logged (the message is what the buddy sees).
 */
export async function sendHi5(senderId: string, receiverId: string, source: "home" | "profile") {
  const [msgResult, hi5Result] = await Promise.all([
    supabase.from("messages").insert({ sender_id: senderId, receiver_id: receiverId, content: HI5_CONTENT }),
    supabase
      .from("hi5s")
      .upsert({ sender_id: senderId, receiver_id: receiverId, updated_at: new Date().toISOString() }, { onConflict: "sender_id,receiver_id" }),
  ]);

  if (msgResult.error) throw msgResult.error;
  if (hi5Result.error) console.error("Hi5 record error:", hi5Result.error);

  track("hi5_sent", { source });
  trackOnce("first_hi5_sent", { source });
}

type Hi5UnsentListener = (receiverId: string) => void;
const unsentListeners = new Set<Hi5UnsentListener>();

/** Get notified when the current user unsends a hi5, so "sent" UI can reset. */
export function onHi5Unsent(listener: Hi5UnsentListener) {
  unsentListeners.add(listener);
  return () => {
    unsentListeners.delete(listener);
  };
}

/** Called by unsendMessage() when a highfive was unsent. */
export function notifyHi5Unsent(receiverId: string) {
  unsentListeners.forEach((listener) => listener(receiverId));
}

import { supabase } from "./supabase";
import { track, trackOnce } from "./track";

/**
 * Send a 👋 message and record the hi5. Throws if the message itself fails;
 * a failed hi5 record is only logged (the message is what the buddy sees).
 */
export async function sendHi5(senderId: string, receiverId: string, source: "home" | "profile") {
  const [msgResult, hi5Result] = await Promise.all([
    supabase.from("messages").insert({ sender_id: senderId, receiver_id: receiverId, content: "👋" }),
    supabase
      .from("hi5s")
      .upsert({ sender_id: senderId, receiver_id: receiverId, updated_at: new Date().toISOString() }, { onConflict: "sender_id,receiver_id" }),
  ]);

  if (msgResult.error) throw msgResult.error;
  if (hi5Result.error) console.error("Hi5 record error:", hi5Result.error);

  track("hi5_sent", { source });
  trackOnce("first_hi5_sent", { source });
}

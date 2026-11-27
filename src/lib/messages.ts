import { supabase } from "./supabase";
import { track } from "./track";
import { notifyHi5Unsent } from "./hi5";
import { parseProposal } from "./proposals";
import type { Message } from "./chat-types";

export type UnsendKind = "highfive" | "message";

/** "Du har fortrudt en besked" / "Mette har fortrudt en highfive" */
export function unsentText(kind: UnsendKind, isMe: boolean, buddyName: string | null) {
  const what = kind === "highfive" ? "en highfive" : "en besked";
  return isMe ? `Du har fortrudt ${what}` : `${buddyName || "Din buddy"} har fortrudt ${what}`;
}

export const isHighfiveContent = (content: string) => content.trim() === "👋";

// One emoji: a flag, a keycap, or a pictograph with optional skin tone /
// variation selector / tags, joined into ZWJ sequences (👨‍👩‍👧).
const EMOJI =
  /\p{Regional_Indicator}{2}|[0-9#*]️?⃣|\p{Extended_Pictographic}[\p{Emoji_Modifier}️\u{E0020}-\u{E007F}]*(?:‍\p{Extended_Pictographic}[\p{Emoji_Modifier}️]*)*/gu;

/** How many emoji the message is made of, or 0 if it contains anything else. */
export function emojiOnlyCount(content: string): number {
  const matches = content.match(EMOJI);
  if (!matches || content.replace(EMOJI, "").trim() !== "") return 0;
  return matches.length;
}

/**
 * Like "Unsend" in Messenger: your own highfives can always be unsent, text
 * messages only while unread. Proposals can't (they belong to an activity).
 * The database (unsend_message) enforces the same rule.
 */
export function canUnsend(msg: Message, myId: string | undefined): boolean {
  if (!myId || msg.sender_id !== myId || msg.unsent_at) return false;
  if (isHighfiveContent(msg.content)) return true;
  return !msg.read_at && !parseProposal(msg.content);
}

/** Unsend a message for both people. Returns the updated (placeholder) message. */
export async function unsendMessage(msg: Message): Promise<Message> {
  const { data, error } = await supabase.rpc("unsend_message", { p_message_id: msg.id });
  if (error) throw error;

  const highfive = isHighfiveContent(msg.content);
  if (highfive) notifyHi5Unsent(msg.receiver_id);
  track(highfive ? "hi5_unsent" : "message_unsent");

  return data;
}

/** Mark everything the buddy sent me as read. Fire-and-forget. */
export function markChatRead(buddyId: string) {
  supabase.rpc("mark_chat_read", { p_buddy_id: buddyId }).then(({ error }) => {
    if (error) console.error("Could not mark chat as read:", error);
  });
}

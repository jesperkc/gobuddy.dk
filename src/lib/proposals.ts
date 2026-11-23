import { supabase } from "./supabase";
import { INTEREST_PHRASES } from "./interestPhrases";
import { track, trackOnce } from "./track";
import { joinPlace } from "./places";

export { joinPlace };

/**
 * A proposal is a concrete-date event sent to one buddy as a chat message.
 * The message ends with the event's path so the chat can render it as a card
 * and older clients still show a usable link.
 */

const PROPOSAL_PATH = /^\/activities\/([a-z0-9-]+)$/;

export interface ProposalInput {
  buddyId: string;
  interestId: string;
  /** Lowercase Danish interest name, used for the sentence. */
  interestName: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM or null */
  time: string | null;
  /** Short place name from the picker, e.g. "Søerne". */
  placeName: string;
  /** Optional detail, e.g. "ved Dronning Louises Bro". */
  meetingPoint?: string;
  latitude: number;
  longitude: number;
}

/**
 * "Skal vi løbe en tur lørdag 15. november kl. 10:00?\n📍 Søerne – ved broen"
 * The place goes on its own line: no single preposition fits a lake, a park and a street address.
 */
export function buildProposalSentence(interestName: string, date: string, time: string | null, place: string): string {
  const verb = INTEREST_PHRASES[interestName]?.invite.replace(/ en (dag|aften)$/, "") ?? `mødes til ${interestName}`;
  const day = new Date(date + "T00:00:00").toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" });
  const when = time ? `${day} kl. ${time.slice(0, 5)}` : day;
  return `Skal vi ${verb} ${when}?\n📍 ${place}`;
}

/** Short title for the event itself, e.g. "Løb med Mette". */
function buildProposalTitle(interestDa: string, buddyName: string | null): string {
  return buddyName ? `${interestDa} med ${buddyName}` : interestDa;
}

/** Split a message into its text and the proposal slug, if the last line is an event path. */
export function parseProposal(content: string): { text: string; slug: string } | null {
  const lines = content.trimEnd().split("\n");
  const match = lines[lines.length - 1]?.match(PROPOSAL_PATH);
  if (!match) return null;
  return { text: lines.slice(0, -1).join("\n").trim(), slug: match[1] };
}

/**
 * Create the event, join the sender, and send the invitation. The event is the
 * source of truth; a failed message is reported but leaves the event in place.
 * Returns the event slug.
 */
export async function sendProposal(senderId: string, buddyName: string | null, interestDa: string, input: ProposalInput): Promise<string> {
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      creator_id: senderId,
      title: buildProposalTitle(interestDa, buddyName),
      place_name: joinPlace(input.placeName, input.meetingPoint),
      latitude: input.latitude,
      longitude: input.longitude,
      date_type: "specific",
      event_date: input.date,
      event_time: input.time,
      max_participants: 2,
    })
    .select("event_id, slug")
    .single();
  if (error) throw error;

  const [intRes, joinRes] = await Promise.all([
    supabase.from("event_interests").insert({ event_id: event.event_id, interest_id: input.interestId }),
    supabase.from("event_participants").insert({ event_id: event.event_id, profile_id: senderId }),
  ]);
  if (intRes.error) console.error("Proposal interest error:", intRes.error);
  if (joinRes.error) console.error("Proposal join error:", joinRes.error);

  const sentence = buildProposalSentence(input.interestName, input.date, input.time, joinPlace(input.placeName, input.meetingPoint));
  const { error: msgError } = await supabase.from("messages").insert({
    sender_id: senderId,
    receiver_id: input.buddyId,
    content: `${sentence}\n/activities/${event.slug}`,
  });
  if (msgError) throw msgError;

  track("proposal_sent", { has_time: !!input.time, has_meeting_point: !!input.meetingPoint?.trim() });
  trackOnce("first_proposal_sent");
  return event.slug;
}

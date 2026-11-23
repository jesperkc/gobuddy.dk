import { mockDb, type MockUser } from "../../.storybook/mocks/supabase";

export const mette: MockUser = { id: "profile-mette", email: "mette@example.dk" };
export const jesper: MockUser = { id: "profile-jesper", email: "jesper@example.dk" };

const running = { interest_id: "int-running", interest_da: "Løb", icon: "running" };
const cycling = { interest_id: "int-cycling", interest_da: "Cykling", icon: "cycling" };

/** Local YYYY-MM-DD a number of days from today. */
export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Two buddies who both like running; Jesper also cycles. Copenhagen. */
export function seedBuddies(loggedInAs: MockUser, extra: Record<string, Record<string, unknown>[]> = {}) {
  mockDb.reset(
    {
      profiles: [
        { profile_id: mette.id, first_name: "Mette", slug: "mette", city: "København", latitude: 55.6761, longitude: 12.5683 },
        { profile_id: jesper.id, first_name: "Jesper", slug: "jesper", city: "København", latitude: 55.6761, longitude: 12.5683 },
      ],
      // A row here means "email verified"; without one, messaging and joining open the verification dialog.
      email_verifications: [{ user_id: mette.id }, { user_id: jesper.id }],
      interests: [running, cycling],
      user_interests: [
        { profile_id: jesper.id, interest_id: running.interest_id, is_non_interest: false, interests: running },
        { profile_id: jesper.id, interest_id: cycling.interest_id, is_non_interest: false, interests: cycling },
        { profile_id: mette.id, interest_id: running.interest_id, is_non_interest: false, interests: running },
      ],
      ...extra,
    },
    loggedInAs,
  );
}

/** An open two-person invitation from Mette, with only her signed up. */
export function seedInvitation(loggedInAs: MockUser) {
  seedBuddies(loggedInAs, {
    events: [
      {
        event_id: "event-1",
        slug: "loeb-med-jesper",
        creator_id: mette.id,
        title: "Løb med Jesper",
        description: null,
        place_name: "Søerne, København",
        latitude: 55.69,
        longitude: 12.56,
        date_type: "specific",
        event_date: daysFromNow(3),
        event_time: "10:00:00",
        max_participants: 2,
        cancelled_at: null,
        created_at: new Date().toISOString(),
      },
    ],
    event_interests: [{ event_id: "event-1", interest_id: running.interest_id }],
    event_participants: [{ event_id: "event-1", profile_id: mette.id }],
  });
}

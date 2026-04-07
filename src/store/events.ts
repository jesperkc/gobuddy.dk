import { create } from "zustand";
import { supabase } from "../lib/supabase";

export type DateType = "specific" | "any" | "weekday" | "weekend" | "weekdays_custom";
export type TimeOfDay = "morgen" | "formiddag" | "eftermiddag" | "aften";

export interface EventWithDetails {
  event_id: string;
  slug: string;
  title: string;
  description: string | null;
  place_name: string;
  latitude: number;
  longitude: number;
  date_type: DateType;
  event_date: string | null;
  event_weekdays: number[] | null;
  event_time: string | null;
  time_of_day: TimeOfDay[] | null;
  max_participants: number | null;
  cancelled_at: string | null;
  created_at: string;
  creator: {
    profile_id: string;
    first_name: string | null;
    slug: string;
  };
  event_interests: {
    interests: {
      interest_id: string;
      interest_da: string;
      icon: string;
    };
  }[];
  event_participants: {
    profile_id: string;
    profiles: {
      profile_id: string;
      first_name: string | null;
      slug: string;
    };
  }[];
}

const EVENT_SELECT = `
  *,
  creator:profiles!creator_id (profile_id, first_name, slug),
  event_interests (
    interests (interest_id, interest_da, icon)
  ),
  event_participants (
    profile_id,
    profiles (profile_id, first_name, slug)
  )
`;

interface EventsState {
  events: EventWithDetails[];
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  fetchEvent: (slug: string) => Promise<EventWithDetails | null>;
  joinEvent: (eventId: string, profileId: string) => Promise<boolean>;
  leaveEvent: (eventId: string, profileId: string) => Promise<boolean>;
  cancelEvent: (eventId: string) => Promise<boolean>;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .is("cancelled_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out past specific-date events
      const today = new Date().toISOString().split("T")[0];
      const filtered = (data as EventWithDetails[]).filter(
        (e) => e.date_type !== "specific" || !e.event_date || e.event_date >= today,
      );

      set({ events: filtered, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchEvent: async (slug: string) => {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("slug", slug)
      .single();

    if (error) return null;
    return data as EventWithDetails;
  },

  joinEvent: async (eventId: string, profileId: string) => {
    const { error } = await supabase
      .from("event_participants")
      .insert({ event_id: eventId, profile_id: profileId });

    if (error) return false;

    // Refresh events list
    get().fetchEvents();
    return true;
  },

  leaveEvent: async (eventId: string, profileId: string) => {
    const { error } = await supabase
      .from("event_participants")
      .delete()
      .eq("event_id", eventId)
      .eq("profile_id", profileId);

    if (error) return false;

    get().fetchEvents();
    return true;
  },

  cancelEvent: async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("event_id", eventId);

    if (error) return false;

    get().fetchEvents();
    return true;
  },
}));

const WEEKDAY_NAMES_DA = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
const TIME_OF_DAY_DA: Record<string, string> = {
  morgen: "Morgen",
  formiddag: "Formiddag",
  eftermiddag: "Eftermiddag",
  aften: "Aften",
};

export function formatEventDate(event: EventWithDetails): string {
  const parts: string[] = [];

  switch (event.date_type) {
    case "specific": {
      if (event.event_date) {
        const d = new Date(event.event_date + "T00:00:00");
        parts.push(
          d.toLocaleDateString("da-DK", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
        );
      }
      break;
    }
    case "any":
      parts.push("Når som helst");
      break;
    case "weekday":
      parts.push("Hverdage");
      break;
    case "weekend":
      parts.push("Weekender");
      break;
    case "weekdays_custom": {
      if (event.event_weekdays?.length) {
        const names = event.event_weekdays
          .sort((a, b) => a - b)
          .map((d) => WEEKDAY_NAMES_DA[d - 1]);
        parts.push(names.join(", "));
      }
      break;
    }
  }

  if (event.event_time) {
    const [h, m] = event.event_time.split(":");
    parts.push(`kl. ${h}:${m}`);
  } else if (event.time_of_day?.length) {
    const labels = event.time_of_day
      .map((t) => TIME_OF_DAY_DA[t]?.toLowerCase())
      .filter(Boolean);
    if (labels.length) parts.push(labels.join(" / "));
  }

  return parts.join(", ");
}

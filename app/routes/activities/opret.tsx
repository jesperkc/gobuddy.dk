import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DefaultLayout } from "../../../src/components/AppShell";
import { ProtectedRoute } from "../../../src/components/ProtectedRoute";
import { EventForm, type EventFormData, type InterestOption } from "../../../src/components/EventForm";
import { useAuth } from "../../../src/contexts/AuthContext";
import { supabase } from "../../../src/lib/supabase";

function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [myInterests, setMyInterests] = useState<InterestOption[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_interests")
      .select("interest_id, is_non_interest, interests (interest_id, interest_da, icon)")
      .eq("profile_id", user.id)
      .eq("is_non_interest", false)
      .then(({ data }) => {
        if (data) {
          setMyInterests(
            data
              .filter((ui: any) => ui.interests)
              .map((ui: any) => ui.interests),
          );
        }
      });
  }, [user]);

  const handleSubmit = async (data: EventFormData) => {
    if (!user) return;
    setSubmitting(true);

    try {
      // 1. Create event
      const { data: event, error } = await supabase
        .from("events")
        .insert({
          creator_id: user.id,
          title: data.title,
          description: data.description || null,
          place_name: data.placeName,
          latitude: data.latitude,
          longitude: data.longitude,
          date_type: data.dateType,
          event_date: data.eventDate,
          event_weekdays: data.eventWeekdays.length > 0 ? data.eventWeekdays : null,
          event_time: data.eventTime,
          time_of_day: data.timeOfDay.length > 0 ? data.timeOfDay : null,
          max_participants: data.maxParticipants,
        })
        .select("event_id, slug")
        .single();

      if (error) throw error;

      // 2. Add interests
      if (data.interestIds.length > 0) {
        const { error: intError } = await supabase
          .from("event_interests")
          .insert(
            data.interestIds.map((interest_id) => ({
              event_id: event.event_id,
              interest_id,
            })),
          );
        if (intError) throw intError;
      }

      // 3. Auto-join creator as participant
      await supabase
        .from("event_participants")
        .insert({ event_id: event.event_id, profile_id: user.id });

      toast.success("Aktivitet oprettet!");
      navigate({ to: "/activities/$slug", params: { slug: event.slug } });
    } catch (err: any) {
      toast.error("Kunne ikke oprette aktivitet: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Opret aktivitet</h1>
        <EventForm onSubmit={handleSubmit} submitting={submitting} myInterests={myInterests} />
      </div>
    </DefaultLayout>
  );
}

function ProtectedCreateEventPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <CreateEventPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/activities/opret")({
  component: ProtectedCreateEventPage,
});

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DefaultLayout } from "../../../../src/components/AppShell";
import { ProtectedRoute } from "../../../../src/components/ProtectedRoute";
import {
  EventForm,
  type EventFormData,
  type EventFormInitialData,
  type InterestOption,
} from "../../../../src/components/EventForm";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useEventsStore, type EventWithDetails } from "../../../../src/store/events";
import { supabase } from "../../../../src/lib/supabase";
import { Skeleton } from "../../../../src/components/ui/skeleton";

function eventToInitialData(event: EventWithDetails): EventFormInitialData {
  const hasSpecificTime = !!event.event_time;
  const hasTimeOfDay = event.time_of_day && event.time_of_day.length > 0;

  return {
    title: event.title,
    description: event.description ?? "",
    placeName: event.place_name,
    latitude: event.latitude,
    longitude: event.longitude,
    dateType: event.date_type as EventFormInitialData["dateType"],
    eventDate: event.event_date ?? "",
    eventWeekdays: event.event_weekdays ?? [],
    timeMode: hasSpecificTime ? "specific" : hasTimeOfDay ? "timeofday" : "none",
    eventTime: event.event_time ?? "",
    timeOfDay: (event.time_of_day ?? []) as EventFormInitialData["timeOfDay"],
    interestIds: event.event_interests.map((ei) => ei.interests.interest_id),
    maxParticipants: event.max_participants != null ? String(event.max_participants) : "",
  };
}

function EditEventPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchEvent } = useEventsStore();

  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myInterests, setMyInterests] = useState<InterestOption[]>([]);

  useEffect(() => {
    fetchEvent(slug).then((e) => {
      setEvent(e);
      setLoading(false);
    });
  }, [slug, fetchEvent]);

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

  // Also include event interests that might not be in user's current interests
  const allInterests = event
    ? [
        ...myInterests,
        ...event.event_interests
          .map((ei) => ei.interests)
          .filter((i) => !myInterests.some((mi) => mi.interest_id === i.interest_id)),
      ]
    : myInterests;

  if (loading) {
    return (
      <DefaultLayout>
        <div className="py-8 px-4 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </DefaultLayout>
    );
  }

  if (!event) {
    return (
      <DefaultLayout>
        <div className="max-w-2xl mx-auto py-16 px-4 text-center text-gray-400">
          <p className="text-lg font-medium">Aktivitet ikke fundet</p>
        </div>
      </DefaultLayout>
    );
  }

  if (user?.id !== event.creator.profile_id) {
    return (
      <DefaultLayout>
        <div className="max-w-2xl mx-auto py-16 px-4 text-center text-gray-400">
          <p className="text-lg font-medium">Du kan kun redigere dine egne aktiviteter</p>
        </div>
      </DefaultLayout>
    );
  }

  const handleSubmit = async (data: EventFormData) => {
    setSubmitting(true);

    try {
      // 1. Update event
      const { error } = await supabase
        .from("events")
        .update({
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
        .eq("event_id", event.event_id);

      if (error) throw error;

      // 2. Replace interests: delete old, insert new
      const { error: delError } = await supabase
        .from("event_interests")
        .delete()
        .eq("event_id", event.event_id);

      if (delError) throw delError;

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

      toast.success("Aktivitet opdateret!");
      navigate({ to: "/aktiviteter/$slug", params: { slug } });
    } catch (err: any) {
      toast.error("Kunne ikke opdatere aktivitet: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Rediger aktivitet</h1>
        <EventForm
          onSubmit={handleSubmit}
          submitting={submitting}
          myInterests={allInterests}
          initialData={eventToInitialData(event)}
          submitLabel="Gem ændringer"
          submittingLabel="Gemmer..."
        />
      </div>
    </DefaultLayout>
  );
}

function ProtectedEditEventPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <EditEventPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/aktiviteter/$slug/rediger")({
  component: ProtectedEditEventPage,
});

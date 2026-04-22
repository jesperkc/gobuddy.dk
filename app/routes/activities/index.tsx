import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle } from "@/components/PageTitle";
import { useEffect } from "react";
import { Plus, Frown } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { ProtectedRoute } from "../../../src/components/ProtectedRoute";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../../src/store/userProfile";
import { useEventsStore } from "../../../src/store/events";
import { EventCard } from "../../../src/components/EventCard";
import { Button } from "../../../src/components/ui/button";
import { haversineDistance } from "../../../src/lib/geo";
import { Skeleton } from "../../../src/components/ui/skeleton";

function EventsPage() {
  const { user } = useAuth();
  const { profile, loadProfile } = useUserProfileStore();
  const { events, loading, error, fetchEvents } = useEventsStore();

  useEffect(() => {
    if (user && !profile) loadProfile(user);
  }, [user, profile, loadProfile]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const myLat = profile?.latitude;
  const myLng = profile?.longitude;

  const getDistance = (lat: number, lng: number): number | null => {
    if (myLat == null || myLng == null) return null;
    return haversineDistance(myLat, myLng, lat, lng);
  };

  return (
    <DefaultLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <PageTitle>Aktiviteter</PageTitle>
            <p className="text-gray-500 mt-1">
              Find og deltag i aktiviteter med andre buddies
            </p>
          </div>
          <Link to="/activities/opret">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Opret
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Content */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Frown className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">Ingen aktiviteter endnu</p>
            <p className="text-sm mt-1">Vær den første til at oprette en!</p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event, i) => (
              <EventCard
                key={event.event_id}
                event={event}
                distanceKm={getDistance(event.latitude, event.longitude)}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

function ProtectedEventsPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <EventsPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/activities/")({
  component: ProtectedEventsPage,
});

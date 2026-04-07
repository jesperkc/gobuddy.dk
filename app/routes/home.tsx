import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { MapPin, ArrowRight, Compass, UserPen, Calendar } from "lucide-react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { useEventsStore } from "../../src/store/events";
import { Button } from "../../src/components/ui/button";
import { safeDate } from "../../src/lib/ssr-utils";
import { supabase } from "../../src/lib/supabase";
import { haversineDistance } from "../../src/lib/geo";
import { BuddyCard, type BuddyProfile } from "../../src/components/BuddyCard";
import { EventCard } from "../../src/components/EventCard";
import { useLocationUpdate } from "../../src/lib/useLocationUpdate";

interface RawBuddyRow {
  profile_id: string;
  slug: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  user_interests: Array<{
    interest_id: string;
    is_non_interest: boolean;
    interests: {
      interest_da: string;
      interest_en: string;
      icon: string;
      category: string | null;
    } | null;
  }>;
}

function HomePage() {
  const { user } = useAuth();
  const { profile, loadProfile } = useUserProfileStore();
  const { events, fetchEvents } = useEventsStore();
  const [buddies, setBuddies] = useState<BuddyProfile[]>([]);

  useEffect(() => {
    if (user && !profile) {
      loadProfile(user);
    }
  }, [user, profile, loadProfile]);

  useLocationUpdate(user, profile, loadProfile);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const myInterestIds = useMemo(() => {
    if (!profile?.user_interests) return new Set<string>();
    return new Set(
      profile.user_interests.filter((i) => !i.is_non_interest).map((i) => i.interest_id),
    );
  }, [profile]);

  const myLat = profile?.latitude;
  const myLng = profile?.longitude;

  // Fetch buddies with shared interests
  useEffect(() => {
    if (!user || myInterestIds.size === 0) return;

    async function fetchBuddies() {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          profile_id, slug, first_name, age, city, latitude, longitude,
          user_interests (
            interest_id, is_non_interest,
            interests (interest_da, interest_en, icon, category)
          )
        `)
        .neq("profile_id", user!.id);

      if (error || !data) return;

      const myIds = myInterestIds;
      const mapped: BuddyProfile[] = (data as unknown as RawBuddyRow[])
        .map((row) => ({
          profile_id: row.profile_id,
          slug: row.slug,
          first_name: row.first_name,
          age: row.age,
          city: row.city,
          latitude: row.latitude,
          longitude: row.longitude,
          interests: (row.user_interests || [])
            .filter((ui) => ui.interests && !ui.is_non_interest)
            .map((ui) => ({
              interest_id: ui.interest_id,
              interest_da: ui.interests!.interest_da,
              icon: ui.interests!.icon,
              category: ui.interests!.category,
            })),
        }))
        .filter((b) => b.interests.some((i) => myIds.has(i.interest_id)));

      setBuddies(mapped);
    }

    fetchBuddies();
  }, [user, myInterestIds]);

  // Sort buddies by distance, take 4 nearest
  const nearestBuddies = useMemo(() => {
    if (myLat == null || myLng == null) return buddies.slice(0, 4);
    return [...buddies]
      .sort((a, b) => {
        const distA = a.latitude != null && a.longitude != null
          ? haversineDistance(myLat, myLng, a.latitude, a.longitude) : Infinity;
        const distB = b.latitude != null && b.longitude != null
          ? haversineDistance(myLat, myLng, b.latitude, b.longitude) : Infinity;
        return distA - distB;
      })
      .slice(0, 4);
  }, [buddies, myLat, myLng]);

  // Sort events by distance, take 4 nearest
  const nearestEvents = useMemo(() => {
    if (myLat == null || myLng == null) return events.slice(0, 4);
    return [...events]
      .sort((a, b) => {
        const distA = haversineDistance(myLat, myLng, a.latitude, a.longitude);
        const distB = haversineDistance(myLat, myLng, b.latitude, b.longitude);
        return distA - distB;
      })
      .slice(0, 4);
  }, [events, myLat, myLng]);

  function getBuddyDistance(buddy: BuddyProfile): number | null {
    if (myLat == null || myLng == null || buddy.latitude == null || buddy.longitude == null) return null;
    return haversineDistance(myLat, myLng, buddy.latitude, buddy.longitude);
  }

  function getEventDistance(lat: number, lng: number): number | null {
    if (myLat == null || myLng == null) return null;
    return haversineDistance(myLat, myLng, lat, lng);
  }

  const getGreeting = () => safeDate.getGreeting("Hej");

  const interests = profile?.user_interests || [];
  const hasInterests = interests.length > 0;
  const hasLocation = !!profile?.city;
  const profileComplete = !!profile?.first_name && !!profile?.age && hasInterests && hasLocation;

  return (
    <DefaultLayout>
      <div className="space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-3xl">
            {getGreeting()}, {profile?.first_name || "Ven"}
          </h1>
          {hasLocation && (
            <p className="text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {profile.city}
            </p>
          )}
        </div>

        {/* Profile completion nudge */}
        {!profileComplete && (
          <div className="rounded-xl bg-gray-50 p-5">
            <h3 className="font-medium mb-3">Gør din profil klar</h3>
            <p className="text-sm text-gray-500 mb-4">
              Jo mere du deler, jo bedre kan vi finde de rigtige buddies til dig.
            </p>
            <div className="space-y-2">
              {!profile?.first_name && (
                <ProfileTask label="Tilføj dit navn" to="/profile-edit" />
              )}
              {!profile?.age && (
                <ProfileTask label="Angiv din alder" to="/profile-edit" />
              )}
              {!hasInterests && (
                <ProfileTask label="Vælg dine interesser" to="/profile-edit" />
              )}
              {!hasLocation && (
                <ProfileTask label="Angiv din placering" to="/profile-edit" />
              )}
            </div>
          </div>
        )}

        {/* Nearest buddies */}
        {nearestBuddies.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Compass className="w-5 h-5" />
                Buddies i nærheden
              </h2>
              <Link
                to="/discover"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
              >
                Se alle
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {nearestBuddies.map((buddy, i) => (
                <BuddyCard
                  key={buddy.profile_id}
                  buddy={buddy}
                  sharedInterestIds={myInterestIds}
                  distanceKm={getBuddyDistance(buddy)}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Nearest activities */}
        {nearestEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Aktiviteter i nærheden
              </h2>
              <Link
                to="/aktiviteter"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
              >
                Se alle
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {nearestEvents.map((event, i) => (
                <EventCard
                  key={event.event_id}
                  event={event}
                  distanceKm={getEventDistance(event.latitude, event.longitude)}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/discover">
              <Compass className="w-4 h-4" />
              Find buddies
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/profile">
              <UserPen className="w-4 h-4" />
              Min profil
            </Link>
          </Button>
        </div>
      </div>
    </DefaultLayout>
  );
}

function ProfileTask({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-gray-400 transition-colors"
    >
      <span className="text-sm">{label}</span>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </Link>
  );
}

function ProtectedHomePage() {
  return (
    <ProtectedRoute redirectTo="/">
      <HomePage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/home")({
  component: ProtectedHomePage,
});

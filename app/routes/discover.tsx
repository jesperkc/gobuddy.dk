import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Search, MapPin, Frown, Compass } from "lucide-react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { supabase } from "../../src/lib/supabase";
import { haversineDistance } from "../../src/lib/geo";
import { BuddyCard, type BuddyProfile, type RelatedInterestInfo } from "../../src/components/BuddyCard";

interface RawBuddyRow {
  profile_id: string;
  slug: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
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

function DiscoverPage() {
  const { user } = useAuth();
  const { profile, loadProfile } = useUserProfileStore();
  const [buddies, setBuddies] = useState<BuddyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedMap, setRelatedMap] = useState<Map<string, Map<string, RelatedInterestInfo[]>>>(new Map());
  const [hi5SentIds, setHi5SentIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<"interests" | "newest">("interests");
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    if (user && !profile) {
      loadProfile(user);
    }
  }, [user, profile, loadProfile]);

  const myInterestIds = useMemo(() => {
    if (!profile?.user_interests) return new Set<string>();
    return new Set(
      profile.user_interests.filter((i) => !i.is_non_interest).map((i) => i.interest_id),
    );
  }, [profile]);

  const myNonInterestIds = useMemo(() => {
    if (!profile?.user_interests) return new Set<string>();
    return new Set(
      profile.user_interests.filter((i) => i.is_non_interest).map((i) => i.interest_id),
    );
  }, [profile]);

  const myLat = profile?.latitude;
  const myLng = profile?.longitude;
  const myCity = profile?.city;

  // Update location from browser geolocation on each visit if user has shared location before
  useEffect(() => {
    if (!user || !profile) return;

    console.log("[Location Debug] Profile coords:", { lat: myLat, lng: myLng, city: myCity });

    if (myLat == null || myLng == null) {
      console.log("[Location Debug] No stored coordinates — skipping geolocation");
      return;
    }

    if (!navigator.geolocation) {
      console.log("[Location Debug] Geolocation API not available");
      return;
    }

    console.log("[Location Debug] Requesting browser geolocation...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log("[Location Debug] Browser position:", { latitude, longitude, accuracy: `${Math.round(accuracy)}m` });

        const distance = haversineDistance(myLat, myLng, latitude, longitude);
        console.log("[Location Debug] Distance from stored:", `${distance.toFixed(2)} km`);

        if (distance < 0.1) {
          console.log("[Location Debug] Less than 100m — no update needed");
          return;
        }

        // Reverse geocode to get city name
        let city: string | undefined;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=da_DK`
          );
          const geo = await res.json();
          city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.municipality;
          console.log("[Location Debug] Reverse geocode city:", city, "| full address:", geo.address);
        } catch (err) {
          console.log("[Location Debug] Reverse geocode failed:", err);
        }

        const updates: Record<string, unknown> = { coordinates: `POINT(${latitude} ${longitude})` };
        if (city) updates.city = city;

        console.log("[Location Debug] Updating profile with:", updates);
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updates)
          .eq("profile_id", user.id);

        if (updateError) {
          console.log("[Location Debug] Update error:", updateError);
        } else {
          console.log("[Location Debug] Profile updated — reloading");
          loadProfile(user);
        }
      },
      (err) => {
        console.log("[Location Debug] Geolocation error:", err.code, err.message);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [user, profile?.profile_id]);

  useEffect(() => {
    if (!user || myInterestIds.size === 0) {
      setLoading(false);
      return;
    }

    async function fetchBuddies() {
      setLoading(true);
      setError(null);

      try {
        const myIds = Array.from(myInterestIds);

        // Fetch profiles, interest_relations, and hi5s in parallel
        const [profilesResult, relationsAResult, relationsBResult, hi5sResult] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              `
              profile_id,
              slug,
              first_name,
              age,
              city,
              latitude,
              longitude,
              created_at,
              user_interests (
                interest_id,
                is_non_interest,
                interests (
                  interest_da,
                  interest_en,
                  icon,
                  category
                )
              )
            `
            )
            .neq("profile_id", user!.id),
          supabase
            .from("interest_relations")
            .select("interest_id_a, interest_id_b, score")
            .in("interest_id_a", myIds)
            .gte("score", 0.5),
          supabase
            .from("interest_relations")
            .select("interest_id_a, interest_id_b, score")
            .in("interest_id_b", myIds)
            .gte("score", 0.5),
          supabase
            .from("hi5s")
            .select("receiver_id")
            .eq("sender_id", user!.id),
        ]);

        if (profilesResult.error) throw profilesResult.error;

        // Build hi5 sent set
        const sentIds = new Set((hi5sResult.data || []).map((h: { receiver_id: string }) => h.receiver_id));
        setHi5SentIds(sentIds);

        // Build map: my interest_id → Set of related interest_ids
        const myToRelated = new Map<string, Set<string>>();
        const allRelations = [
          ...(relationsAResult.data || []),
          ...(relationsBResult.data || []),
        ];

        for (const rel of allRelations) {
          const myId = myInterestIds.has(rel.interest_id_a) ? rel.interest_id_a : rel.interest_id_b;
          const otherId = myId === rel.interest_id_a ? rel.interest_id_b : rel.interest_id_a;
          if (!myToRelated.has(myId)) myToRelated.set(myId, new Set());
          myToRelated.get(myId)!.add(otherId);
        }

        // Collect all related interest IDs (not including exact matches or my non-interests)
        const allRelatedIds = new Set<string>();
        for (const relatedSet of myToRelated.values()) {
          for (const id of relatedSet) {
            if (!myInterestIds.has(id) && !myNonInterestIds.has(id)) allRelatedIds.add(id);
          }
        }

        const rows = (profilesResult.data || []) as unknown as RawBuddyRow[];

        const mapped: BuddyProfile[] = rows
          .map((row) => ({
            profile_id: row.profile_id,
            slug: row.slug,
            first_name: row.first_name,
            age: row.age,
            city: row.city,
            latitude: row.latitude,
            longitude: row.longitude,
            created_at: row.created_at,
            interests: (row.user_interests || [])
              .filter((ui) => ui.interests && !ui.is_non_interest)
              .map((ui) => ({
                interest_id: ui.interest_id,
                interest_da: ui.interests!.interest_da,
                icon: ui.interests!.icon,
                category: ui.interests!.category,
              })),
          }))
          // Include buddies with exact OR related interest matches
          .filter((b) =>
            b.interests.some(
              (i) => myInterestIds.has(i.interest_id) || allRelatedIds.has(i.interest_id)
            )
          );

        // Build per-buddy related interests map
        const buddyRelatedMap = new Map<string, Map<string, RelatedInterestInfo[]>>();
        for (const buddy of mapped) {
          const relatedForBuddy: RelatedInterestInfo[] = [];

          for (const interest of buddy.interests) {
            // Skip exact matches
            if (myInterestIds.has(interest.interest_id)) continue;
            // Check if this buddy interest is related to any of mine
            if (allRelatedIds.has(interest.interest_id)) {
              relatedForBuddy.push({
                interest_id: interest.interest_id,
                interest_da: interest.interest_da,
                icon: interest.icon,
              });
            }
          }

          if (relatedForBuddy.length > 0) {
            buddyRelatedMap.set(buddy.profile_id, new Map([["interests", relatedForBuddy]]));
          }
        }

        setBuddies(mapped);
        setRelatedMap(buddyRelatedMap);
      } catch (err) {
        console.error("Error fetching buddies:", err);
        setError("Kunne ikke hente buddies. Prøv igen senere.");
      } finally {
        setLoading(false);
      }
    }

    fetchBuddies();
  }, [user, myInterestIds]);

  function getRelatedInterests(buddyId: string): RelatedInterestInfo[] {
    return relatedMap.get(buddyId)?.get("interests") || [];
  }

  // Sort: by selected mode
  const sortedBuddies = useMemo(() => {
    return [...buddies].sort((a, b) => {
      if (sortMode === "newest") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }

      // Default: closest first, then by shared interest score as tiebreaker
      if (myLat != null && myLng != null) {
        const distA =
          a.latitude != null && a.longitude != null
            ? haversineDistance(myLat, myLng, a.latitude, a.longitude)
            : Infinity;
        const distB =
          b.latitude != null && b.longitude != null
            ? haversineDistance(myLat, myLng, b.latitude, b.longitude)
            : Infinity;
        if (distA !== distB) return distA - distB;
      }

      // Tiebreaker: more shared interests first
      const sharedA = a.interests.filter((i) => myInterestIds.has(i.interest_id)).length;
      const sharedB = b.interests.filter((i) => myInterestIds.has(i.interest_id)).length;
      const relatedA = getRelatedInterests(a.profile_id).length;
      const relatedB = getRelatedInterests(b.profile_id).length;
      const scoreA = sharedA + relatedA * 0.5;
      const scoreB = sharedB + relatedB * 0.5;
      return scoreB - scoreA;
    });
  }, [buddies, sortMode, myInterestIds, myLat, myLng, relatedMap]);

  const visibleBuddies = useMemo(
    () => sortedBuddies.slice(0, visibleCount),
    [sortedBuddies, visibleCount]
  );

  function getDistance(buddy: BuddyProfile): number | null {
    if (
      myLat == null || myLng == null ||
      buddy.latitude == null || buddy.longitude == null
    ) {
      return null;
    }
    return haversineDistance(myLat, myLng, buddy.latitude, buddy.longitude);
  }

  const hasLocation = myLat != null && myLng != null;
  const hasInterests = myInterestIds.size > 0;

  return (
    <DefaultLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl flex items-center gap-2">
            <Compass className="w-8 h-8" />
            Find buddies
          </h1>
          <p className="text-gray-500 mt-1">
            Folk i nærheden der deler dine interesser
          </p>
        </div>

        {/* Missing profile data warnings */}
        {!hasInterests && !loading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
            <Search className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="font-medium">Tilføj interesser først</p>
            <p className="text-sm text-gray-600 mt-1">
              Vi kan kun finde buddies, hvis du har valgt mindst én interesse.
            </p>
          </div>
        )}

        {!hasLocation && hasInterests && !loading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            Tilføj din placering for at se afstand til andre buddies.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border p-5 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/4" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-6 bg-gray-100 rounded-full w-16" />
                      <div className="h-6 bg-gray-100 rounded-full w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && hasInterests && sortedBuddies.length > 0 && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                {sortedBuddies.length} {sortedBuddies.length === 1 ? "buddy" : "buddies"} fundet
                {hasLocation && myCity && (
                  <span> · Afstand fra <span className="font-medium text-gray-700">{myCity}</span></span>
                )}
              </p>

              {/* Sort dropdown */}
              <select
                value={sortMode}
                onChange={(e) => {
                  setSortMode(e.target.value as "interests" | "newest");
                  setVisibleCount(12);
                }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="interests">Flest fælles interesser</option>
                <option value="newest">Nyeste</option>
              </select>
            </div>

            <div className="space-y-3">
              {visibleBuddies.map((buddy, i) => (
                <BuddyCard
                  key={buddy.profile_id}
                  buddy={buddy}
                  sharedInterestIds={myInterestIds}
                  relatedInterests={getRelatedInterests(buddy.profile_id)}
                  distanceKm={getDistance(buddy)}
                  hi5Sent={hi5SentIds.has(buddy.profile_id)}
                  index={i}
                />
              ))}
            </div>

            {/* Show more button */}
            {visibleBuddies.length < sortedBuddies.length && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setVisibleCount((c) => c + 12)}
                  className="px-6 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Vis flere
                </button>
              </div>
            )}
          </>
        )}

        {/* No results */}
        {!loading && hasInterests && sortedBuddies.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <Frown className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h2 className="text-lg font-medium mb-1">Ingen buddies fundet endnu</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Der er ingen andre brugere med fælles interesser lige nu.
              Tjek tilbage senere — der kommer hele tiden nye buddies til!
            </p>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

function ProtectedDiscoverPage() {
  return (
    <ProtectedRoute redirectTo="/">
      <DiscoverPage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/discover")({
  component: ProtectedDiscoverPage,
});

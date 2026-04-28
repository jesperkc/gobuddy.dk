import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/PageTitle";
import { useEffect, useState, useMemo } from "react";
import { Search, MapPin, Frown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { supabase } from "../../src/lib/supabase";
import { haversineDistance } from "../../src/lib/geo";
import { BuddyCard, type BuddyProfile, type RawBuddyRow, type RelatedInterestInfo, mapBuddyRow } from "../../src/components/BuddyCard";
import { useLocationUpdate } from "../../src/lib/useLocationUpdate";
import { SCORE_MEDIUM } from "@/lib/interestRelations";

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

  const interestKey = useMemo(
    () =>
      (profile?.user_interests ?? [])
        .filter((i) => !i.is_non_interest)
        .map((i) => i.interest_id)
        .sort()
        .join(","),
    [profile?.user_interests],
  );

  const nonInterestKey = useMemo(
    () =>
      (profile?.user_interests ?? [])
        .filter((i) => i.is_non_interest)
        .map((i) => i.interest_id)
        .sort()
        .join(","),
    [profile?.user_interests],
  );

  const myInterestIds = useMemo(() => (interestKey ? new Set(interestKey.split(",")) : new Set<string>()), [interestKey]);

  const myNonInterestIds = useMemo(() => (nonInterestKey ? new Set(nonInterestKey.split(",")) : new Set<string>()), [nonInterestKey]);

  const myLat = profile?.latitude;
  const myLng = profile?.longitude;
  const myCity = profile?.city;

  useLocationUpdate(user, profile, loadProfile);

  const profileReady = !!profile;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!profileReady) return;

    async function fetchBuddies() {
      setError(null);

      try {
        const myIds = Array.from(myInterestIds);

        // Fetch profiles, related interests via RPC, and hi5s in parallel.
        // Skip the related-interests RPC when the user has no interests of their own.
        const [profilesResult, relationsResult, hi5sResult] = await Promise.all([
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
              avatar_url,
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
            `,
            )
            .neq("profile_id", user!.id),
          myIds.length > 0
            ? supabase.rpc("get_related_interests", { my_ids: myIds, min_score: SCORE_MEDIUM })
            : Promise.resolve({ data: [] as Array<{ my_id: string; related_id: string }>, error: null }),
          supabase.from("hi5s").select("receiver_id").eq("sender_id", user!.id),
        ]);

        if (profilesResult.error) throw profilesResult.error;
        if (relationsResult.error) throw relationsResult.error;

        // Build hi5 sent set
        const sentIds = new Set((hi5sResult.data || []).map((h: { receiver_id: string }) => h.receiver_id));
        setHi5SentIds(sentIds);

        // Build map: my interest_id → Set of related interest_ids
        const myToRelated = new Map<string, Set<string>>();
        for (const rel of relationsResult.data ?? []) {
          if (!myToRelated.has(rel.my_id)) myToRelated.set(rel.my_id, new Set());
          myToRelated.get(rel.my_id)!.add(rel.related_id);
        }

        // Collect all related interest IDs (not including exact matches or my non-interests)
        const allRelatedIds = new Set<string>();
        for (const relatedSet of myToRelated.values()) {
          for (const id of relatedSet) {
            if (!myInterestIds.has(id) && !myNonInterestIds.has(id)) allRelatedIds.add(id);
          }
        }

        const rows = (profilesResult.data || []) as unknown as RawBuddyRow[];

        // When the user has interests, filter to buddies sharing at least one (direct or related).
        // When the user has none, show everyone — they can still be sorted by distance/recency.
        const mapped = rows
          .map(mapBuddyRow)
          .filter((b) =>
            myInterestIds.size === 0 ? true : b.interests.some((i) => myInterestIds.has(i.interest_id) || allRelatedIds.has(i.interest_id)),
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
  }, [user, profileReady, myInterestIds, myNonInterestIds]);

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
        const distA = a.latitude != null && a.longitude != null ? haversineDistance(myLat, myLng, a.latitude, a.longitude) : Infinity;
        const distB = b.latitude != null && b.longitude != null ? haversineDistance(myLat, myLng, b.latitude, b.longitude) : Infinity;
        if (distA !== distB) return distA - distB;
      }

      // Tiebreaker: more shared interests first
      const sharedA = a.interests.filter((i) => myInterestIds.has(i.interest_id)).length;
      const sharedB = b.interests.filter((i) => myInterestIds.has(i.interest_id)).length;
      const relatedA = relatedMap.get(a.profile_id)?.get("interests")?.length ?? 0;
      const relatedB = relatedMap.get(b.profile_id)?.get("interests")?.length ?? 0;
      const scoreA = sharedA + relatedA * 0.5;
      const scoreB = sharedB + relatedB * 0.5;
      return scoreB - scoreA;
    });
  }, [buddies, sortMode, myInterestIds, myLat, myLng, relatedMap]);

  const visibleBuddies = useMemo(() => sortedBuddies.slice(0, visibleCount), [sortedBuddies, visibleCount]);

  function getDistance(buddy: BuddyProfile): number | null {
    if (myLat == null || myLng == null || buddy.latitude == null || buddy.longitude == null) {
      return null;
    }
    return haversineDistance(myLat, myLng, buddy.latitude, buddy.longitude);
  }

  const hasLocation = myLat != null && myLng != null;
  const hasInterests = myInterestIds.size > 0;

  return (
    <DefaultLayout
      header={
        <div>
          <PageTitle>Find buddies</PageTitle>
          <p className="text-gray-500 mt-1">Folk i nærheden der deler dine interesser</p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Soft prompts — shown alongside results, not as a gate */}
        {!hasInterests && !loading && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 flex items-center gap-2">
            <Search className="w-4 h-4 shrink-0" />
            Tilføj interesser for at finde buddies med fælles interesser.
          </div>
        )}

        {!hasLocation && !loading && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            Tilføj din placering for at se afstand til andre buddies.
          </div>
        )}

        {/* Error */}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {/* Loading */}
        {loading && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                {sortedBuddies.length} {sortedBuddies.length === 1 ? "buddy" : "buddies"} fundet
                {hasLocation && myCity && (
                  <span>
                    {" "}
                    · Afstand fra <span className="font-medium text-gray-700">{myCity}</span>
                  </span>
                )}
              </p>

              {/* Sort dropdown */}
              <Select
                value={sortMode}
                onValueChange={(value: "interests" | "newest") => {
                  setSortMode(value);
                  setVisibleCount(12);
                }}
              >
                <SelectTrigger className="w-auto text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interests">Flest fælles interesser</SelectItem>
                  <SelectItem value="newest">Nyeste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
                  <div className="h-16 w-16 rounded-full bg-gray-200 mb-3" />
                  <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    <div className="h-5 w-14 bg-gray-100 rounded-full" />
                    <div className="h-5 w-20 bg-gray-100 rounded-full" />
                    <div className="h-5 w-12 bg-gray-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Results */}
        {!loading && sortedBuddies.length > 0 && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                {sortedBuddies.length} {sortedBuddies.length === 1 ? "buddy" : "buddies"} fundet
                {hasLocation && myCity && (
                  <span>
                    {" "}
                    · Afstand fra <span className="font-medium text-gray-700">{myCity}</span>
                  </span>
                )}
              </p>

              {/* Sort dropdown */}
              <Select
                value={sortMode}
                onValueChange={(value: "interests" | "newest") => {
                  setSortMode(value);
                  setVisibleCount(12);
                }}
              >
                <SelectTrigger className="w-auto text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interests">Flest fælles interesser</SelectItem>
                  <SelectItem value="newest">Nyeste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        {!loading && sortedBuddies.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <Frown className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h2 className="text-lg font-medium mb-1">Ingen buddies fundet endnu</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Der er ingen andre brugere lige nu. Tjek tilbage senere — der kommer hele tiden nye buddies til!
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

export const Route = createFileRoute("/buddies")({
  component: ProtectedDiscoverPage,
});

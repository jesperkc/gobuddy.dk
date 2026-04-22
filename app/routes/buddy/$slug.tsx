import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { ProtectedRoute } from "../../../src/components/ProtectedRoute";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../../src/store/userProfile";
import { useChatPopupStore } from "../../../src/store/chatPopup";
import { supabase } from "../../../src/lib/supabase";
import { useActivityPostsStore } from "@/store/activityPosts";
import { ProfileView, ProfileHero, type ProfileViewData, type RelatedPair, ProfileHeroSkeleton } from "@/components/ProfileView";
import { SCORE_MEDIUM } from "@/lib/interestRelations";

function BuddyProfile() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { profile: myProfile, loadProfile } = useUserProfileStore();
  const openChat = useChatPopupStore((s) => s.openChat);
  const [profile, setProfile] = useState<ProfileViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waveSent, setWaveSent] = useState(false);
  const [sendingWave, setSendingWave] = useState(false);
  const [relatedPairs, setRelatedPairs] = useState<RelatedPair[]>([]);
  const [stravaAthleteId, setStravaAthleteId] = useState<number | null>(null);
  const { posts: activityPosts, fetchPosts: fetchActivityPosts } = useActivityPostsStore();

  useEffect(() => {
    if (user && !myProfile) loadProfile(user);
  }, [user, myProfile, loadProfile]);

  // Check if hi5 already sent to this buddy
  useEffect(() => {
    if (!user || !profile) return;
    supabase
      .from("hi5s")
      .select("sender_id")
      .eq("sender_id", user.id)
      .eq("receiver_id", profile.profile_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setWaveSent(true);
      });
  }, [user, profile]);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const { data, error: queryError } = await supabase
          .from("profiles")
          .select(
            `
            profile_id,
            first_name,
            age,
            city,
            country,
            avatar_url,
            created_at,
            user_interests (
              interest_id,
              description,
              is_non_interest,
              interests (
                interest_da,
                interest_en,
                icon
              )
            )
          `,
          )
          .eq("slug", slug)
          .single();

        if (queryError) throw queryError;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = data as any;
        const allInterests = (row.user_interests || []).filter((ui: { interests: unknown }) => ui.interests);
        setProfile({
          profile_id: row.profile_id,
          first_name: row.first_name,
          age: row.age,
          city: row.city,
          country: row.country,
          avatar_url: row.avatar_url,
          created_at: row.created_at,
          interests: allInterests
            .filter((ui: { is_non_interest: boolean }) => !ui.is_non_interest)
            .map((ui: { interest_id: string; description: string | null; interests: { interest_da: string; icon: string } }) => ({
              interest_id: ui.interest_id,
              interest_da: ui.interests.interest_da,
              icon: ui.interests.icon,
              description: ui.description,
            })),
          nonInterests: allInterests
            .filter((ui: { is_non_interest: boolean }) => ui.is_non_interest)
            .map((ui: { interest_id: string; interests: { interest_da: string; icon: string } }) => ({
              interest_id: ui.interest_id,
              interest_da: ui.interests.interest_da,
              icon: ui.interests.icon,
            })),
        });
      } catch (err) {
        console.error("Error fetching buddy profile:", err);
        setError("Kunne ikke finde denne bruger.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [slug]);

  // Load activity posts for this buddy
  useEffect(() => {
    if (profile?.profile_id) fetchActivityPosts(profile.profile_id, 50);
  }, [profile?.profile_id, fetchActivityPosts]);

  // Load buddy's Strava connection (public athlete id). If RLS blocks it, silently hide.
  useEffect(() => {
    if (!profile?.profile_id) return;
    supabase
      .from("strava_connections")
      .select("strava_athlete_id")
      .eq("profile_id", profile.profile_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.strava_athlete_id) setStravaAthleteId(data.strava_athlete_id);
      });
  }, [profile?.profile_id]);

  const myInterestIds = useMemo(() => {
    if (!myProfile?.user_interests) return new Set<string>();
    return new Set(myProfile.user_interests.filter((i) => !i.is_non_interest).map((i) => i.interest_id));
  }, [myProfile]);

  const myNonInterestIds = useMemo(() => {
    if (!myProfile?.user_interests) return new Set<string>();
    return new Set(myProfile.user_interests.filter((i) => i.is_non_interest).map((i) => i.interest_id));
  }, [myProfile]);

  const myInterestMap = useMemo(() => {
    const m = new Map<string, string>();
    if (!myProfile?.user_interests) return m;
    for (const ui of myProfile.user_interests) {
      if (!ui.is_non_interest && ui.interests?.interest_da) m.set(ui.interest_id, ui.interests.interest_da);
    }
    return m;
  }, [myProfile]);

  useEffect(() => {
    if (!profile || myInterestIds.size === 0) return;

    async function fetchRelatedInterests() {
      try {
        const myIds = Array.from(myInterestIds);
        const buddyIds = profile!.interests.map((i) => i.interest_id);
        const buddyOnlyIds = buddyIds.filter((id) => !myInterestIds.has(id) && !myNonInterestIds.has(id));
        if (buddyOnlyIds.length === 0) return;

        const buddyOnlySet = new Set(buddyOnlyIds);
        const { data: relData, error: relErr } = await supabase.rpc("get_related_interests", {
          my_ids: myIds,
          min_score: SCORE_MEDIUM,
        });
        if (relErr) throw relErr;

        const buddyInterestMap = new Map(profile!.interests.map((i) => [i.interest_id, i.interest_da]));

        const pairs: RelatedPair[] = [];
        const seen = new Set<string>();

        for (const rel of relData ?? []) {
          if (!buddyOnlySet.has(rel.related_id)) continue;
          const key = `${rel.my_id}-${rel.related_id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const myName = myInterestMap.get(rel.my_id);
          const buddyName = buddyInterestMap.get(rel.related_id);
          if (myName && buddyName) {
            pairs.push({
              myInterest: { interest_id: rel.my_id, interest_da: myName },
              buddyInterest: { interest_id: rel.related_id, interest_da: buddyName },
              score: rel.score,
            });
          }
        }

        pairs.sort((a, b) => b.score - a.score);
        setRelatedPairs(pairs);
      } catch (err) {
        console.error("Error fetching related interests:", err);
      }
    }

    fetchRelatedInterests();
  }, [profile, myInterestIds, myNonInterestIds, myInterestMap]);

  function goToChat() {
    if (!profile) return;
    openChat(profile.profile_id, profile.first_name);
  }

  async function sendWave() {
    if (!user || !profile || sendingWave) return;
    setSendingWave(true);

    try {
      const [msgResult, hi5Result] = await Promise.all([
        supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: profile.profile_id,
          content: "👋",
        }),
        supabase
          .from("hi5s")
          .upsert(
            { sender_id: user.id, receiver_id: profile.profile_id, updated_at: new Date().toISOString() },
            { onConflict: "sender_id,receiver_id" },
          ),
      ]);

      if (msgResult.error) throw msgResult.error;
      if (hi5Result.error) console.error("Hi5 record error:", hi5Result.error);
      setWaveSent(true);
      openChat(profile.profile_id, profile.first_name);
    } catch (err) {
      console.error("Error sending wave:", err);
      setError("Kunne ikke sende highfive. Prøv igen.");
    } finally {
      setSendingWave(false);
    }
  }

  const heroHeader = (
    <div>
      <Link to="/buddies" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Tilbage til buddies
      </Link>

      {loading ? (
        <ProfileHeroSkeleton />
      ) : profile ? (
        <ProfileHero
          data={profile}
          isOwn={false}
          myInterestIds={myInterestIds}
          relatedPairs={relatedPairs}
          activityPosts={activityPosts}
          onChat={goToChat}
          onWave={sendWave}
          waveSent={waveSent}
          sendingWave={sendingWave}
          flat
        />
      ) : null}
    </div>
  );

  return (
    <DefaultLayout header={heroHeader}>
      {!loading && profile && (
        <ProfileView
          data={profile}
          isOwn={false}
          hideHero
          myInterestIds={myInterestIds}
          relatedPairs={relatedPairs}
          stravaAthleteId={stravaAthleteId}
          activityPosts={activityPosts}
          onChat={goToChat}
          onWave={sendWave}
          waveSent={waveSent}
          sendingWave={sendingWave}
          error={error}
        />
      )}
    </DefaultLayout>
  );
}

function ProtectedBuddyProfile() {
  return (
    <ProtectedRoute redirectTo="/">
      <BuddyProfile />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/buddy/$slug")({
  component: ProtectedBuddyProfile,
});

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { ProtectedRoute, type AuthedProps } from "../../../src/components/ProtectedRoute";
import { useChatPopupStore } from "../../../src/store/chatPopup";
import { supabase } from "../../../src/lib/supabase";
import { useActivityPostsStore } from "@/store/activityPosts";
import { ProfileView, ProfileHero, type ProfileViewData, type RelatedPair, ProfileHeroSkeleton } from "@/components/ProfileView";
import { SCORE_MEDIUM } from "@/lib/interestRelations";
import { RequireVerifiedEmail } from "@/components/EmailVerification";
import { onHi5Unsent, sendHi5 } from "@/lib/hi5";
import { requireVerifiedEmail } from "@/store/emailVerification";

function BuddyProfile({ user, profile: myProfile }: AuthedProps) {
  const { slug } = Route.useParams();
  const openChat = useChatPopupStore((s) => s.openChat);
  const [profile, setProfile] = useState<ProfileViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waveSent, setWaveSent] = useState(false);
  const [sendingWave, setSendingWave] = useState(false);
  // Have I sent this buddy anything (highfive or message) that's still there?
  const [hasMessaged, setHasMessaged] = useState<boolean | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [relatedPairs, setRelatedPairs] = useState<RelatedPair[]>([]);
  const [stravaAthleteId, setStravaAthleteId] = useState<number | null>(null);
  const { posts: activityPosts, fetchPosts: fetchActivityPosts } = useActivityPostsStore();

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

  // Reset "sent" when the hi5 is unsent elsewhere (e.g. from the chat popup)
  useEffect(() => {
    if (!profile) return;
    return onHi5Unsent((receiverId) => {
      if (receiverId === profile.profile_id) setWaveSent(false);
    });
  }, [profile]);

  // The highfive button is only offered until I've written to this buddy. Kept
  // live, so writing (or unsending) in the chat popup updates the profile.
  useEffect(() => {
    if (!user || !profile) return;
    const buddyId = profile.profile_id;

    function check() {
      supabase
        .from("messages")
        .select("id")
        .eq("sender_id", user.id)
        .eq("receiver_id", buddyId)
        .is("unsent_at", null)
        .limit(1)
        .then(({ data, error }) => {
          if (!error) setHasMessaged((data ?? []).length > 0);
        });
    }
    check();

    const channel = supabase
      .channel(`profile-messages:${buddyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const msg = (payload.new ?? {}) as { sender_id?: string; receiver_id?: string };
        if (msg.sender_id === user.id && msg.receiver_id === buddyId) check();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  // Check follow state for this buddy
  useEffect(() => {
    if (!user || !profile) return;
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.profile_id)
      .maybeSingle()
      .then(({ data }) => {
        setIsFollowing(!!data);
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
            bio,
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
          bio: row.bio,
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

  async function toggleFollow() {
    if (!user || !profile || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    try {
      if (wasFollowing) {
        const { error: delErr } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.profile_id);
        if (delErr) throw delErr;
      } else {
        const { error: insErr } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: profile.profile_id });
        if (insErr) throw insErr;
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      setIsFollowing(wasFollowing);
      setError("Kunne ikke opdatere følg-status. Prøv igen.");
    } finally {
      setFollowLoading(false);
    }
  }

  async function sendWave() {
    if (!user || !profile || sendingWave) return;
    if (!requireVerifiedEmail()) return;
    setSendingWave(true);

    try {
      await sendHi5(user.id, profile.profile_id, "profile");
      setWaveSent(true);
      setHasMessaged(true);
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
          onWave={hasMessaged === false ? sendWave : undefined}
          waveSent={waveSent}
          sendingWave={sendingWave}
          onFollow={toggleFollow}
          isFollowing={isFollowing}
          followLoading={followLoading}
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
          onWave={hasMessaged === false ? sendWave : undefined}
          waveSent={waveSent}
          sendingWave={sendingWave}
          onFollow={toggleFollow}
          isFollowing={isFollowing}
          followLoading={followLoading}
          error={error}
        />
      )}
    </DefaultLayout>
  );
}

function ProtectedBuddyProfile() {
  return (
    <ProtectedRoute redirectTo="/">
      {(props) => (
        <RequireVerifiedEmail>
          <BuddyProfile {...props} />
        </RequireVerifiedEmail>
      )}
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/buddy/$slug")({
  component: ProtectedBuddyProfile,
});

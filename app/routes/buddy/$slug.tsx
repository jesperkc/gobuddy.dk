import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { MapPin, Calendar, ArrowLeft, MessageCircle, Hand, Sparkles, Ban } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { ProtectedRoute } from "../../../src/components/ProtectedRoute";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../../src/store/userProfile";
import { useChatPopupStore } from "../../../src/store/chatPopup";
import { supabase } from "../../../src/lib/supabase";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../../../src/components/ui/avatar";
import { useActivityPostsStore } from "@/store/activityPosts";
import { ActivityPostCard } from "@/components/ActivityPostCard";

interface PublicProfile {
  profile_id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  created_at: string | null;
  interests: {
    interest_id: string;
    interest_da: string;
    icon: string;
    description: string | null;
  }[];
  nonInterests: {
    interest_id: string;
    interest_da: string;
    icon: string;
  }[];
}

interface RelatedPair {
  myInterest: { interest_id: string; interest_da: string };
  buddyInterest: { interest_id: string; interest_da: string };
  score: number;
}

function BuddyProfile() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { profile: myProfile, loadProfile } = useUserProfileStore();
  const openChat = useChatPopupStore((s) => s.openChat);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waveSent, setWaveSent] = useState(false);
  const [sendingWave, setSendingWave] = useState(false);
  const [relatedPairs, setRelatedPairs] = useState<RelatedPair[]>([]);
  const { posts: activityPosts, fetchPosts: fetchActivityPosts } = useActivityPostsStore();

  useEffect(() => {
    if (user && !myProfile) {
      loadProfile(user);
    }
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
    if (profile?.profile_id) {
      fetchActivityPosts(profile.profile_id, 50);
    }
  }, [profile?.profile_id, fetchActivityPosts]);

  // Fetch related interests between my interests and the buddy's interests
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
        // Exclude exact matches
        const buddyOnlyIds = buddyIds.filter((id) => !myInterestIds.has(id) && !myNonInterestIds.has(id));
        if (buddyOnlyIds.length === 0) return;

        const [relA, relB] = await Promise.all([
          supabase
            .from("interest_relations")
            .select("interest_id_a, interest_id_b, score")
            .in("interest_id_a", myIds)
            .in("interest_id_b", buddyOnlyIds)
            .gte("score", 0.5),
          supabase
            .from("interest_relations")
            .select("interest_id_a, interest_id_b, score")
            .in("interest_id_a", buddyOnlyIds)
            .in("interest_id_b", myIds)
            .gte("score", 0.5),
        ]);

        const allRels = [...(relA.data || []), ...(relB.data || [])];
        const buddyInterestMap = new Map(profile!.interests.map((i) => [i.interest_id, i.interest_da]));

        const pairs: RelatedPair[] = [];
        const seen = new Set<string>();

        for (const rel of allRels) {
          const myId = myInterestIds.has(rel.interest_id_a) ? rel.interest_id_a : rel.interest_id_b;
          const buddyId = myId === rel.interest_id_a ? rel.interest_id_b : rel.interest_id_a;
          const key = `${myId}-${buddyId}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const myName = myInterestMap.get(myId);
          const buddyName = buddyInterestMap.get(buddyId);
          if (myName && buddyName) {
            pairs.push({
              myInterest: { interest_id: myId, interest_da: myName },
              buddyInterest: { interest_id: buddyId, interest_da: buddyName },
              score: rel.score,
            });
          }
        }

        // Sort by score descending
        pairs.sort((a, b) => b.score - a.score);
        setRelatedPairs(pairs);
      } catch (err) {
        console.error("Error fetching related interests:", err);
      }
    }

    fetchRelatedInterests();
  }, [profile, myInterestIds, myInterestMap]);

  function goToChat() {
    if (!profile) return;
    openChat(profile.profile_id, profile.first_name);
  }

  async function sendWave() {
    if (!user || !profile || sendingWave) return;
    setSendingWave(true);

    try {
      // Send message and record hi5 in parallel
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

  const initials = profile?.first_name ? profile.first_name.slice(0, 2).toUpperCase() : "?";

  return (
    <DefaultLayout>
      <div className="space-y-6">
        <Link to="/buddies" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Tilbage til buddies
        </Link>

        <ErrorBanner message={error} />

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-7 bg-gray-200 rounded w-40" />
                <div className="h-4 bg-gray-100 rounded w-28" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-full w-24" />
              ))}
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 text-2xl">
                {profile.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.first_name || ""} />
                )}
                <AvatarFallback className="bg-blue-100 text-blue-700">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl">
                  {profile.first_name || "Anonym"}
                  {profile.age ? `, ${profile.age}` : ""}
                </h1>
                {profile.city && (
                  <p className="text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.city}
                    {profile.country ? `, ${profile.country}` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToChat}
                  className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center justify-center"
                  title={`Skriv til ${profile.first_name || "denne buddy"}`}
                >
                  <MessageCircle className="w-6 h-6" />
                </button>
                {!waveSent ? (
                  <button
                    onClick={sendWave}
                    disabled={sendingWave}
                    className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <Hand className={`w-6 h-6 ${sendingWave ? "animate-bounce" : ""}`} />
                  </button>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Hand className="w-6 h-6" />
                  </div>
                )}
              </div>
            </div>

            {/* Interests */}
            {profile.interests.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Interesser</h2>
                <div className="grid grid-cols-2 gap-4">
                  {profile.interests.map((interest) => {
                    const isShared = myInterestIds.has(interest.interest_id);
                    return (
                      <div
                        key={interest.interest_id}
                        className={`inline-flex flex-col px-3 py-1.5 rounded-xl text-base ${
                          isShared ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <span className="font-medium">{interest.interest_da}</span>
                        {interest.description && <span className="text-gray-500 mt-0.5">{interest.description}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Related interests */}
            {relatedPairs.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-violet-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Relaterede interesser
                </h2>
                <div className="space-y-2">
                  {relatedPairs.map((pair) => (
                    <div
                      key={`${pair.myInterest.interest_id}-${pair.buddyInterest.interest_id}`}
                      className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-base font-medium text-violet-800">Du: {pair.myInterest.interest_da}</span>
                        <span className="text-violet-400">→</span>
                        <span className="text-base font-medium text-violet-800">
                          {profile.first_name || "De"}: {pair.buddyInterest.interest_da}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(pair.score * 100)}%` }} />
                        </div>
                        <span className="text-xs text-violet-500 font-medium w-8 text-right">{Math.round(pair.score * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Non-interests */}
            {profile.nonInterests.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-red-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Ban className="w-4 h-4" />
                  Ikke-interesser
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {profile.nonInterests.map((interest) => (
                    <div
                      key={interest.interest_id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-base font-medium bg-red-50 text-red-700 border border-red-200"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {interest.interest_da}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Posts */}
            {activityPosts.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Seneste aktiviteter</h2>
                <div className="space-y-3">
                  {activityPosts.slice(0, 10).map((post, i) => (
                    <ActivityPostCard key={post.id} post={post} showAuthor={false} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Member since */}
            {profile.created_at && (
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Medlem siden</span>
                  <span className="text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString("da-DK", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Highfive confirmation */}
            {waveSent && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-base text-green-700">
                👋 Highfive sendt! De kan se din besked i chatten.
              </div>
            )}
          </div>
        ) : null}
      </div>
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

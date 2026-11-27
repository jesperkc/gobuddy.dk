import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { DefaultLayout } from "../../src/components/AppShell";
import { PageTitle } from "@/components/PageTitle";
import { ProtectedRoute, type AuthedProps } from "../../src/components/ProtectedRoute";
import { useUserProfileStore } from "../../src/store/userProfile";
import { useEventsStore } from "../../src/store/events";
import { useActivityPostsStore } from "../../src/store/activityPosts";
import { safeDate } from "../../src/lib/ssr-utils";
import { supabase } from "../../src/lib/supabase";
import { haversineDistance } from "../../src/lib/geo";
import { BuddyCard, type BuddyProfile, type RawBuddyRow, mapBuddyRow } from "../../src/components/BuddyCard";
import { EventCard } from "../../src/components/EventCard";
import { ActivityPostCard } from "../../src/components/ActivityPostCard";
import { useLocationUpdate } from "../../src/lib/useLocationUpdate";
import { LockedNote, VerifyEmailBanner } from "@/components/EmailVerification";
import { requireVerifiedEmail, useEmailVerificationStore } from "@/store/emailVerification";
import { FirstPostPrompt } from "@/components/FirstPostPrompt";
import { BioPrompt } from "@/components/BioPrompt";
import { useFirstPostsStore } from "@/store/firstPosts";
import { SectionHeader } from "@/components/SectionHeader";
import { BestMatchCard } from "@/components/BestMatchCard";
import { ProposalDialog } from "@/components/ProposalDialog";
import { NoNearbyBuddies } from "@/components/NoNearbyBuddies";
import { useChatPopupStore } from "../../src/store/chatPopup";
import { onHi5Unsent, sendHi5 } from "@/lib/hi5";
import { trackOnce } from "@/lib/track";
import { toast } from "sonner";

const NEARBY_RADIUS_KM = 50;

function HomePage({ user, profile }: AuthedProps) {
  const { loadProfile } = useUserProfileStore();
  const { events, fetchEvents } = useEventsStore();
  const { posts: feedPosts, fetchPosts: fetchFeedPosts } = useActivityPostsStore();
  const [buddies, setBuddies] = useState<BuddyProfile[]>([]);
  const [buddiesLoaded, setBuddiesLoaded] = useState(false);
  const [hi5SentIds, setHi5SentIds] = useState<Set<string>>(new Set());
  const [sendingHi5, setSendingHi5] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const openChat = useChatPopupStore((s) => s.openChat);
  const verified = useEmailVerificationStore((s) => s.verified);
  const bioSkipped = useFirstPostsStore((s) => s.bioSkipped && s.userId === user?.id);

  useEffect(() => {
    trackOnce("first_home_view");
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("hi5s")
      .select("receiver_id")
      .eq("sender_id", user.id)
      .then(({ data }) => setHi5SentIds(new Set((data ?? []).map((h) => h.receiver_id))));
  }, [user]);

  // A hi5 unsent from the chat popup makes that buddy's card ask for a hi5 again
  useEffect(
    () =>
      onHi5Unsent((receiverId) =>
        setHi5SentIds((prev) => {
          if (!prev.has(receiverId)) return prev;
          const next = new Set(prev);
          next.delete(receiverId);
          return next;
        }),
      ),
    [],
  );

  useLocationUpdate(user, profile, loadProfile);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (verified !== true) return;
    fetchFeedPosts(undefined, 20);
  }, [fetchFeedPosts, verified]);

  const interestKey = useMemo(
    () =>
      (profile?.user_interests ?? [])
        .filter((i) => !i.is_non_interest)
        .map((i) => i.interest_id)
        .sort()
        .join(","),
    [profile?.user_interests],
  );

  const myInterestIds = useMemo(() => {
    if (!interestKey) return new Set<string>();
    return new Set(interestKey.split(","));
  }, [interestKey]);

  const myLat = profile?.latitude;
  const myLng = profile?.longitude;

  // Fetch buddies with shared interests
  useEffect(() => {
    if (!user || myInterestIds.size === 0 || verified !== true) return;

    async function fetchBuddies() {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          profile_id, slug, first_name, age, city, latitude:approx_latitude, longitude:approx_longitude, avatar_url,
          user_interests (
            interest_id, is_non_interest,
            interests (interest_da, interest_en, icon, category)
          )
        `,
        )
        .neq("profile_id", user!.id);

      if (error || !data) return;

      const mapped = (data as unknown as RawBuddyRow[])
        .map(mapBuddyRow)
        .filter((b) => b.interests.some((i) => myInterestIds.has(i.interest_id)));

      setBuddies(mapped);
      setBuddiesLoaded(true);
    }

    fetchBuddies();
  }, [user, myInterestIds, verified]);

  // Rank by shared interests, then distance. Only people within NEARBY_RADIUS_KM
  // count as "nearby" (when we don't know our own position we can't tell, so keep all).
  const ranked = useMemo(() => {
    return buddies
      .map((buddy) => {
        const distance =
          myLat != null && myLng != null && buddy.latitude != null && buddy.longitude != null
            ? haversineDistance(myLat, myLng, buddy.latitude, buddy.longitude)
            : null;
        const shared = buddy.interests.filter((i) => myInterestIds.has(i.interest_id)).length;
        return { buddy, distance, shared };
      })
      .sort((a, b) => b.shared - a.shared || (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [buddies, myLat, myLng, myInterestIds]);

  const nearby = useMemo(() => ranked.filter((r) => r.distance === null || r.distance <= NEARBY_RADIUS_KM), [ranked]);
  const topMatch = nearby[0] ?? null;
  const nearestKm = useMemo(() => {
    const distances = ranked.map((r) => r.distance).filter((d): d is number => d !== null);
    return distances.length ? Math.min(...distances) : null;
  }, [ranked]);

  // The rest of the nearby people, closest first (top match is shown on its own).
  const nearestBuddies = useMemo(
    () =>
      nearby
        .slice(1)
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        .slice(0, 4)
        .map((r) => r.buddy),
    [nearby],
  );

  async function handleTopMatchHi5() {
    if (!user || !topMatch || sendingHi5) return;
    if (!requireVerifiedEmail()) return;
    setSendingHi5(true);
    try {
      await sendHi5(user.id, topMatch.buddy.profile_id, "home");
      setHi5SentIds((prev) => new Set(prev).add(topMatch.buddy.profile_id));
      openChat(topMatch.buddy.profile_id, topMatch.buddy.first_name);
    } catch (err) {
      console.error("Error sending hi5:", err);
      toast.error("Kunne ikke sende highfive. Prøv igen.");
    } finally {
      setSendingHi5(false);
    }
  }

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
  // The bio is the first thing we ask for; the first-post prompt waits until it's answered or skipped.
  const bioPending = !!profile && !profile.bio?.trim() && !bioSkipped;
  const askVisible = verified === false || (verified === true && (hi5SentIds.size > 0 || (buddiesLoaded && !topMatch)));
  const bioPromptVisible = bioPending && askVisible;

  const profileTasks = [
    { done: !!profile?.first_name, label: "Tilføj dit navn" },
    { done: !!profile?.age, label: "Angiv din alder" },
    { done: hasInterests, label: "Vælg dine interesser" },
    { done: hasLocation, label: "Angiv din placering" },
    { done: !!profile?.avatar_url, label: "Tilføj et profilbillede" },
    // Not listed while the bio card itself is on screen — one prompt is enough.
    { done: !!profile?.bio?.trim(), label: "Skriv et par linjer om dig selv", hidden: bioPromptVisible },
  ];
  const openTasks = profileTasks.filter((t) => !t.done && !t.hidden);

  return (
    <DefaultLayout
      header={
        <div>
          <PageTitle>
            {getGreeting()} {profile?.first_name}
          </PageTitle>
          {hasLocation && (
            <p className="text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {profile.city}
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        <VerifyEmailBanner />

        {/* Unverified: the bio (then the first post) is the one thing they can do. People stay
            locked; the banner above says so, so no extra lock card here. */}
        {verified === false && (bioPending ? <BioPrompt /> : <FirstPostPrompt />)}

        {/* Verified: the best nearby match, or an honest empty state */}
        {verified === true &&
          profile &&
          myInterestIds.size > 0 &&
          (topMatch ? (
            <div>
              <SectionHeader id="best-match-title" title="Din bedste match i nærheden" to="/buddies" />
              <BestMatchCard
                buddy={topMatch.buddy}
                sharedInterestIds={myInterestIds}
                distanceKm={topMatch.distance}
                hi5Sent={hi5SentIds.has(topMatch.buddy.profile_id)}
                sending={sendingHi5}
                onHi5={handleTopMatchHi5}
                onChat={() => openChat(topMatch.buddy.profile_id, topMatch.buddy.first_name)}
                onPropose={() => {
                  if (requireVerifiedEmail()) setProposalOpen(true);
                }}
              />
              <ProposalDialog
                open={proposalOpen}
                onOpenChange={setProposalOpen}
                buddyId={topMatch.buddy.profile_id}
                buddyName={topMatch.buddy.first_name}
              />
            </div>
          ) : (
            <NoNearbyBuddies radiusKm={NEARBY_RADIUS_KM} nearestKm={nearestKm} />
          ))}

        {/* Verified: ask for a first post once they've said hi, or if there's nobody nearby to say hi to */}
        {verified === true && askVisible && bioPending && <BioPrompt />}
        <FirstPostPrompt hidden={verified !== true || !askVisible || bioPending} />

        {/* Profile completion nudge: people reply to profiles with a photo and a few words */}
        {profile && openTasks.length > 0 && (
          <section className="rounded-2xl bg-gray-50 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-1">
              <h2 className="text-base font-medium">Gør din profil klar</h2>
              <span className="text-xs text-gray-500">
                {profileTasks.length - openTasks.length} af {profileTasks.length}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full bg-gray-200 mb-3 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={profileTasks.length}
              aria-valuenow={profileTasks.length - openTasks.length}
              aria-label="Profil udfyldt"
            >
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${((profileTasks.length - openTasks.length) / profileTasks.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">Folk svarer oftere, når de kan se et billede og lidt om dig.</p>
            <div className="space-y-2">
              {openTasks.map((t) => (
                <ProfileTask key={t.label} label={t.label} to="/profile-edit" />
              ))}
            </div>
          </section>
        )}

        {/* More people nearby */}
        {nearestBuddies.length > 0 && (
          <div>
            <SectionHeader title="Flere buddies i nærheden" to="/buddies" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {nearestBuddies.map((buddy, i) => (
                <BuddyCard
                  key={buddy.profile_id}
                  buddy={buddy}
                  sharedInterestIds={myInterestIds}
                  distanceKm={getBuddyDistance(buddy)}
                  hi5Sent={hi5SentIds.has(buddy.profile_id)}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Activities (1/3) + Feed (2/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Aktiviteter i nærheden — 1/3 */}
          {nearestEvents.length > 0 && (
            <div className="lg:col-span-1">
              <SectionHeader title="Aktiviteter" to="/activities" />
              <div className="space-y-4">
                {nearestEvents.map((event, i) => (
                  <EventCard key={event.event_id} event={event} distanceKm={getEventDistance(event.latitude, event.longitude)} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Feed — 2/3 */}
          <div className={nearestEvents.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
            <SectionHeader title="Feed" to="/feed" />
            {verified === false ? (
              <LockedNote />
            ) : feedPosts.length > 0 ? (
              <div className="space-y-3">
                {feedPosts.slice(0, 10).map((post, i) => (
                  <ActivityPostCard key={post.id} post={post} showAuthor={true} index={i} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Ingen aktiviteter i dit feed endnu.</p>
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}

function ProfileTask({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
    >
      <span className="text-sm">{label}</span>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </Link>
  );
}

function ProtectedHomePage() {
  return <ProtectedRoute redirectTo="/">{(props) => <HomePage {...props} />}</ProtectedRoute>;
}

export const Route = createFileRoute("/home")({
  component: ProtectedHomePage,
});

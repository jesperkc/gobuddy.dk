import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Calendar, Mail, Pencil, Ban, ExternalLink } from "lucide-react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { Button } from "../../src/components/ui/button";
import { ProfilePhotoDialog } from "@/components/ProfilePhotoDialog";
import { ErrorBanner } from "@/components/ErrorBanner";
import { supabase } from "@/lib/supabase";
import type { StravaConnection } from "@/lib/strava";
import { useActivityPostsStore } from "@/store/activityPosts";
import { ActivityPostCard } from "@/components/ActivityPostCard";
import { toast } from "sonner";

function Profile() {
  const { user } = useAuth();
  const { profile, loading, error, loadProfile } = useUserProfileStore();
  const [stravaConnection, setStravaConnection] = useState<StravaConnection | null>(null);
  const { posts: activityPosts, fetchPosts: fetchActivityPosts, deletePost } = useActivityPostsStore();

  useEffect(() => {
    if (user && !profile && !loading) {
      loadProfile(user);
    }
  }, [user, profile, loadProfile, loading]);

  // Load Strava connection
  useEffect(() => {
    if (!user?.id) return;

    const loadStrava = async () => {
      try {
        const { data } = await supabase
          .from("strava_connections")
          .select("*")
          .eq("profile_id", user.id)
          .single();

        if (data) {
          setStravaConnection(data as unknown as StravaConnection);
        }
      } catch {
        // No connection — that's fine
      }
    };

    loadStrava();
  }, [user?.id]);

  // Load activity posts
  useEffect(() => {
    if (user?.id) {
      fetchActivityPosts(user.id, 500);
    }
  }, [user?.id, fetchActivityPosts]);

  const interests = (profile?.user_interests || []).filter((i) => !i.is_non_interest);
  const nonInterests = (profile?.user_interests || []).filter((i) => i.is_non_interest);

  return (
    <DefaultLayout>
      <div className="space-y-6">
        <ErrorBanner message={error} />

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-100 rounded w-48" />
            <div className="h-4 bg-gray-100 rounded w-32" />
            <div className="flex gap-2 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-full w-24" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header — avatar + name + location + edit */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <ProfilePhotoDialog
                  avatarUrl={profile?.avatar_url}
                  name={profile?.first_name}
                  initials={profile?.first_name?.slice(0, 2).toUpperCase() || "?"}
                />
                <div>
                  <h1 className="text-3xl">
                    {profile?.first_name || "Unavngivet"}
                    {profile?.age ? `, ${profile.age}` : ""}
                  </h1>
                  {profile?.city && (
                    <p className="text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.city}
                      {profile.country ? `, ${profile.country}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/profile-edit">
                  <Pencil className="w-3.5 h-3.5" />
                  Rediger
                </Link>
              </Button>
            </div>

            {/* Interests */}
            {interests.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Interesser</h2>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest.interest_id}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-base font-medium bg-gray-100 text-gray-800"
                      title={interest.description}
                    >
                      {interest.interests.interest_da}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Non-interests */}
            {nonInterests.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-red-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Ban className="w-4 h-4" />
                  Ikke-interesser
                </h2>
                <div className="flex flex-wrap gap-2">
                  {nonInterests.map((interest) => (
                    <span
                      key={interest.interest_id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-base font-medium bg-red-50 text-red-700 border border-red-200"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {interest.interests.interest_da}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Stats — computed from all activity posts */}
            {activityPosts.length > 0 && (() => {
              const statsMap = new Map<string, { label: string; icon: string; count: number }>();
              for (const post of activityPosts) {
                if (!post.interest) continue;
                const key = post.interest.interest_id;
                const existing = statsMap.get(key) || {
                  label: post.interest.interest_da,
                  icon: post.interest.icon,
                  count: 0,
                };
                existing.count++;
                statsMap.set(key, existing);
              }
              const stats = Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
              return stats.length > 0 ? (
                <div>
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Aktivitetsstatistik
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stats.map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold">{s.count}</p>
                        <p className="text-xs text-gray-500">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Activity Posts */}
            {activityPosts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Seneste aktiviteter
                  </h2>
                  <Link
                    to="/feed"
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Se alle i feed →
                  </Link>
                </div>
                <div className="space-y-3">
                  {activityPosts.slice(0, 5).map((post, i) => (
                    <ActivityPostCard
                      key={post.id}
                      post={post}
                      showAuthor={false}
                      onDelete={async (id) => {
                        if (!confirm("Slet dette indlæg?")) return;
                        const ok = await deletePost(id);
                        if (ok) toast.success("Indlæg slettet");
                        else toast.error("Kunne ikke slette indlæg");
                      }}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            {stravaConnection && (
              <div className="border-t pt-6">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Tilslutninger</h2>
                <a
                  href={`https://www.strava.com/athletes/${stravaConnection.strava_athlete_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FC4C02]/10 text-[#FC4C02] hover:bg-[#FC4C02]/20 transition-colors text-sm font-medium"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  Strava
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Details */}
            <div className="border-t pt-6 space-y-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Detaljer</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={user?.email} />
                <DetailRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Medlem siden"
                  value={
                    profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("da-DK", {
                          month: "long",
                          year: "numeric",
                        })
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2 text-base">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-900">{value || "Ikke angivet"}</span>
    </div>
  );
}

function ProtectedProfile() {
  return (
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/profile")({
  component: ProtectedProfile,
});

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { supabase } from "@/lib/supabase";
import type { StravaConnection } from "@/lib/strava";
import { useActivityPostsStore } from "@/store/activityPosts";
import { toast } from "sonner";
import { ProfileView, type ProfileViewData } from "@/components/ProfileView";

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

  useEffect(() => {
    if (!user?.id) return;
    const loadStrava = async () => {
      try {
        const { data } = await supabase.from("strava_connections").select("*").eq("profile_id", user.id).single();
        if (data) setStravaConnection(data as unknown as StravaConnection);
      } catch {
        // No connection — that's fine
      }
    };
    loadStrava();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchActivityPosts(user.id, 500);
  }, [user?.id, fetchActivityPosts]);

  const viewData = useMemo<ProfileViewData | null>(() => {
    if (!profile || !user) return null;
    const all = profile.user_interests || [];
    return {
      profile_id: profile.id,
      first_name: profile.first_name || null,
      age: profile.age || null,
      city: profile.city || null,
      country: profile.country || null,
      avatar_url: profile.avatar_url || null,
      created_at: profile.created_at || null,
      email: user.email || null,
      interests: all
        .filter((i) => !i.is_non_interest)
        .map((i) => ({
          interest_id: i.interest_id,
          interest_da: i.interests.interest_da,
          icon: i.interests.icon,
          description: i.description,
        })),
      nonInterests: all
        .filter((i) => i.is_non_interest)
        .map((i) => ({
          interest_id: i.interest_id,
          interest_da: i.interests.interest_da,
          icon: i.interests.icon,
        })),
    };
  }, [profile, user]);

  const handleDeletePost = async (id: string) => {
    if (!confirm("Slet dette indlæg?")) return;
    const ok = await deletePost(id);
    if (ok) toast.success("Indlæg slettet");
    else toast.error("Kunne ikke slette indlæg");
  };

  return (
    <DefaultLayout>
      {loading || !viewData ? (
        <div className="space-y-6">
          <div className="card-reveal relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div aria-hidden className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-gradient-to-br from-blue-100 via-blue-50 to-green-50" />
            <div className="relative p-6 sm:p-8 pt-8 sm:pt-10 animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">
                <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-gray-200 ring-4 ring-white" />
                <div className="flex-1 space-y-3">
                  <div className="h-10 bg-gray-200 rounded w-56" />
                  <div className="h-4 bg-gray-100 rounded w-40" />
                </div>
              </div>
              <div className="mt-6 pt-5 border-t border-gray-100 flex gap-8">
                <div className="space-y-2">
                  <div className="h-6 w-8 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-8 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded-full w-24" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ProfileView
          data={viewData}
          isOwn
          stravaAthleteId={stravaConnection?.strava_athlete_id ?? null}
          activityPosts={activityPosts}
          onDeletePost={handleDeletePost}
          error={error}
        />
      )}
    </DefaultLayout>
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

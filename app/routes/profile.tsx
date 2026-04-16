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

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Calendar, Mail, Pencil, Ban, ExternalLink } from "lucide-react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { Button } from "../../src/components/ui/button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { supabase } from "@/lib/supabase";
import type { StravaConnection, StravaAthlete, StravaStats } from "@/lib/strava";
import { fetchAthleteStats } from "@/lib/strava";

function Profile() {
  const { user } = useAuth();
  const { profile, loading, error, loadProfile } = useUserProfileStore();
  const [stravaConnection, setStravaConnection] = useState<StravaConnection | null>(null);
  const [stravaStats, setStravaStats] = useState<StravaStats | null>(null);

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

          try {
            const athleteData = data.athlete_data as Record<string, unknown>;
            const stats = await fetchAthleteStats(data.access_token, athleteData?.id as number);
            setStravaStats(stats);
          } catch {
            // Token might be expired — stats are optional
          }
        }
      } catch {
        // No connection — that's fine
      }
    };

    loadStrava();
  }, [user?.id]);

  const interests = (profile?.user_interests || []).filter((i) => !i.is_non_interest);
  const nonInterests = (profile?.user_interests || []).filter((i) => i.is_non_interest);

  return (
    <DefaultLayout>
      <div>
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
            {/* Header — name + location + edit */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl">
                    {profile?.first_name || "Unavngivet"}
                    {profile?.age ? `, ${profile.age}` : ""}
                  </h1>
                  {stravaConnection && (
                    <a
                      href={`https://www.strava.com/athletes/${stravaConnection.strava_athlete_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FC4C02] text-white text-xs font-medium hover:bg-[#e04402] transition-colors"
                      title={`Strava: ${(stravaConnection.athlete_data as unknown as StravaAthlete)?.firstname || ""}`}
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                      </svg>
                      Strava
                    </a>
                  )}
                </div>
                {profile?.city && (
                  <p className="text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.city}
                    {profile.country ? `, ${profile.country}` : ""}
                  </p>
                )}
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

            {/* Strava Stats */}
            {stravaConnection && stravaStats && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#FC4C02]">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  Strava-statistik
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {stravaStats.all_run_totals.count > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold">{(stravaStats.all_run_totals.distance / 1000).toFixed(0)} km</p>
                      <p className="text-xs text-gray-500">Løb ({stravaStats.all_run_totals.count})</p>
                    </div>
                  )}
                  {stravaStats.all_ride_totals.count > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold">{(stravaStats.all_ride_totals.distance / 1000).toFixed(0)} km</p>
                      <p className="text-xs text-gray-500">Cykling ({stravaStats.all_ride_totals.count})</p>
                    </div>
                  )}
                  {stravaStats.all_swim_totals.count > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold">{(stravaStats.all_swim_totals.distance / 1000).toFixed(1)} km</p>
                      <p className="text-xs text-gray-500">Svømning ({stravaStats.all_swim_totals.count})</p>
                    </div>
                  )}
                </div>
                <a
                  href={`https://www.strava.com/athletes/${stravaConnection.strava_athlete_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-[#FC4C02] hover:underline"
                >
                  Se profil på Strava
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

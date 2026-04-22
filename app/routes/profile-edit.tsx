import { useState, useEffect } from "react";
import { PageTitle } from "@/components/PageTitle";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ExternalLink, Link2, Link2Off, Loader2, Lock, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { IAddress } from "@/components/LocationPicker";
import { DefaultLayout } from "@/components/AppShell";
import { fetchProfileWithInterests } from "../../src/lib/fetchProfileWithInterests";
import { toast } from "sonner";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useActivityPostsStore } from "@/store/activityPosts";
import {
  buildStravaAuthUrl,
  mapActivitiesToInterests,
  fetchRecentActivities,
  fetchAthleteStats,
  STRAVA_SPORT_MAP,
  type StravaConnection,
  type StravaActivity,
  type StravaStats,
  type StravaAthlete,
} from "@/lib/strava";
import {
  ProfileTabBar,
  AvatarEditor,
  DetailsTabPanel,
  InterestsTabPanel,
  LocationTabPanel,
  type UserProfile,
  type DetailsFormValues,
} from "@/components/profile-edit";

type TabType = "details" | "interests" | "location" | "connections";

// Search params for the profile-edit page
interface ProfileEditSearch {
  tab?: TabType;
  strava_error?: string;
  strava_connected?: string;
}

export function ProfileEdit() {
  const { profileData } = Route.useLoaderData();
  const { user, loading: loadingUser } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Tab state — default to search param or "details"
  const [activeTab, setActiveTab] = useState<TabType>(search.tab || "details");

  // Data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Strava state
  const [stravaConnection, setStravaConnection] = useState<StravaConnection | null>(null);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [stravaStats, setStravaStats] = useState<StravaStats | null>(null);
  const [stravaImportableSports, setStravaImportableSports] = useState<
    { interest_id: string; interest_da: string }[]
  >([]);
  const [importingInterests, setImportingInterests] = useState(false);
  const [reimporting, setReimporting] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Activity posts (for stats from all sources)
  const { posts: activityPosts, fetchPosts: fetchActivityPosts } = useActivityPostsStore();

  // Form states for editing
  const [selectedInterestsWithDescriptions, setSelectedInterestsWithDescriptions] = useState<Record<string, string>>({});
  const [selectedNonInterests, setSelectedNonInterests] = useState<Set<string>>(new Set());
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [address, setAddress] = useState<IAddress>({
    postcode: "",
    city: "",
    country: "",
    country_code: "",
  });

  useEffect(() => {
    const handleData = async () => {
      if (!user?.id || loadingUser) return; // Wait for auth to fully initialize
      // console.log("Fetching profile data for user:", user.id, loadingUser);

      try {
        setProfile(profileData.profile);
        setAvatarUrl(profileData.profile.avatar_url || null);

        // Initialize selected interests with descriptions
        const interestsWithDescriptions: Record<string, string> = {};
        const nonInterestIds = new Set<string>();
        profileData.interests.forEach((interest) => {
          if (interest.is_non_interest) {
            nonInterestIds.add(interest.interest_id);
          } else {
            interestsWithDescriptions[interest.interest_id] = interest.description || "";
          }
        });
        setSelectedInterestsWithDescriptions(interestsWithDescriptions);
        setSelectedNonInterests(nonInterestIds);

        // Set initial location data
        if (profileData.profile.city) {
          // setSearchQuery(profileData.city);
          setAddress({
            postcode: "",
            city: profileData.profile.city,
            country: "",
            country_code: "",
          });
        }
        setCoordinates({
          lat: profileData.profile.latitude || 0,
          lng: profileData.profile.longitude || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while fetching data");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    handleData();
  }, [profileData]);

  // Show Strava toast messages from redirect
  useEffect(() => {
    if (search.strava_connected === "true") {
      toast.success("Strava er nu tilsluttet!");
    }
    if (search.strava_error) {
      const errorMessages: Record<string, string> = {
        no_code: "Ingen autorisationskode modtaget fra Strava",
        invalid_user: "Ugyldig bruger",
        storage_failed: "Kunne ikke gemme Strava-forbindelsen",
        exchange_failed: "Kunne ikke forbinde til Strava — prøv igen",
        access_denied: "Adgang nægtet af Strava",
      };
      toast.error(errorMessages[search.strava_error] || `Strava-fejl: ${search.strava_error}`);
    }
  }, [search.strava_connected, search.strava_error]);

  // Load activity posts for stats
  useEffect(() => {
    if (user?.id) {
      fetchActivityPosts(user.id, 500);
    }
  }, [user?.id, fetchActivityPosts]);

  // Load Strava connection data
  useEffect(() => {
    if (!user?.id) return;

    const loadStravaConnection = async () => {
      setStravaLoading(true);
      try {
        const { data, error } = await supabase
          .from("strava_connections")
          .select("*")
          .eq("profile_id", user.id)
          .single();

        if (data && !error) {
          setStravaConnection(data as unknown as StravaConnection);

          // Load activities and stats from Strava API
          try {
            const athleteData = data.athlete_data as Record<string, unknown>;
            const athleteId = athleteData?.id as number;

            const [activities, stats] = await Promise.all([
              fetchRecentActivities(data.access_token, 200),
              fetchAthleteStats(data.access_token, athleteId),
            ]);

            setStravaActivities(activities);
            setStravaStats(stats);

            // Find importable sports
            const sportNames = mapActivitiesToInterests(activities);
            if (sportNames.length > 0) {
              const { data: matchingInterests } = await supabase
                .from("interests")
                .select("interest_id, interest_da")
                .in("interest_da", sportNames);

              // Filter out interests the user already has (check DB, not local state)
              const { data: existingUserInterests } = await supabase
                .from("user_interests")
                .select("interest_id")
                .eq("profile_id", user.id)
                .eq("is_non_interest", false);

              const existingIds = new Set(
                (existingUserInterests || []).map((ui) => ui.interest_id)
              );
              const importable = (matchingInterests || []).filter(
                (i) => !existingIds.has(i.interest_id)
              );
              setStravaImportableSports(importable);
            }
          } catch (apiErr) {
            console.warn("Could not load Strava activities:", apiErr);
          }
        }
      } catch {
        // No connection found — that's fine
      } finally {
        setStravaLoading(false);
      }
    };

    loadStravaConnection();
  }, [user?.id, search.strava_connected]);

  // Strava connect handler
  const connectStrava = () => {
    if (!user?.id) return;
    window.location.href = buildStravaAuthUrl(user.id);
  };

  // Strava disconnect handler
  const disconnectStrava = async () => {
    if (!user?.id || !stravaConnection) return;

    try {
      setSaving(true);

      // Delete from database (RLS ensures user can only delete their own)
      const { error } = await supabase
        .from("strava_connections")
        .delete()
        .eq("profile_id", user.id);

      if (error) throw error;

      setStravaConnection(null);
      setStravaActivities([]);
      setStravaStats(null);
      setStravaImportableSports([]);
      toast.success("Strava er afbrudt");
    } catch (err) {
      console.error("Error disconnecting Strava:", err);
      toast.error("Kunne ikke afbryde Strava");
    } finally {
      setSaving(false);
    }
  };

  // Import Strava sports as interests
  const importStravaInterests = async () => {
    if (!user?.id || stravaImportableSports.length === 0) return;

    try {
      setImportingInterests(true);

      const rows = stravaImportableSports.map((interest) => ({
        profile_id: user.id,
        interest_id: interest.interest_id,
        description: "",
        is_non_interest: false,
      }));

      const { error } = await supabase
        .from("user_interests")
        .upsert(rows, { onConflict: "profile_id,interest_id" });
      if (error) throw error;

      // Update local state
      const newInterests = { ...selectedInterestsWithDescriptions };
      for (const interest of stravaImportableSports) {
        newInterests[interest.interest_id] = "";
      }
      setSelectedInterestsWithDescriptions(newInterests);
      setStravaImportableSports([]);

      toast.success(`${rows.length} interesse${rows.length > 1 ? "r" : ""} importeret fra Strava!`);
    } catch (err) {
      console.error("Error importing Strava interests:", err);
      toast.error("Kunne ikke importere interesser");
    } finally {
      setImportingInterests(false);
    }
  };

  // Reimport Strava activities as activity posts
  const reimportStravaActivities = async () => {
    if (!user?.id || !stravaConnection) return;

    setReimporting(true);
    try {
      const activities = await fetchRecentActivities(stravaConnection.access_token, 200);

      // Resolve interest IDs for sport types
      const { data: allInterests } = await supabase
        .from("interests")
        .select("interest_id, interest_da");

      const interestMap = new Map<string, string>();
      if (allInterests) {
        for (const row of allInterests) {
          interestMap.set(row.interest_da.toLowerCase(), row.interest_id);
        }
      }

      let imported = 0;
      for (const activity of activities) {
        const danishName = STRAVA_SPORT_MAP[activity.sport_type];
        const interestId = danishName ? interestMap.get(danishName.toLowerCase()) ?? null : null;

        const descParts: string[] = [];
        if (activity.distance > 0) {
          descParts.push(activity.distance >= 1000 ? `${(activity.distance / 1000).toFixed(1)} km` : `${Math.round(activity.distance)} m`);
        }
        if (activity.moving_time > 0) {
          const h = Math.floor(activity.moving_time / 3600);
          const m = Math.floor((activity.moving_time % 3600) / 60);
          descParts.push(h > 0 ? `${h}t ${m}m` : `${m} min`);
        }
        if (activity.total_elevation_gain > 0) {
          descParts.push(`↑ ${Math.round(activity.total_elevation_gain)} m`);
        }

        const { error } = await supabase
          .from("activity_posts")
          .upsert(
            {
              profile_id: user.id,
              interest_id: interestId,
              title: activity.name,
              description: descParts.join(" · "),
              source: "strava",
              source_id: String(activity.id),
              source_url: `https://www.strava.com/activities/${activity.id}`,
              source_data: activity as unknown as Record<string, unknown>,
              activity_date: activity.start_date,
              private: activity.visibility !== "everyone",
            },
            { onConflict: "source,source_id" }
          );

        if (!error) imported++;
      }

      toast.success(`${imported} aktivitet${imported !== 1 ? "er" : ""} importeret fra Strava!`);
      // Refresh activity posts so stats update
      fetchActivityPosts(user.id, 500);
    } catch (err) {
      console.error("Error reimporting Strava activities:", err);
      toast.error("Kunne ikke importere aktiviteter");
    } finally {
      setReimporting(false);
    }
  };

  // Tab navigation
  const tabs = [
    { id: "details" as TabType, label: "Personlige oplysninger" },
    { id: "interests" as TabType, label: "Interesser" },
    { id: "location" as TabType, label: "Placering" },
    { id: "connections" as TabType, label: "Tilslutninger" },
  ];

  // Save functions
  const saveDetails = async (values: DetailsFormValues) => {
    if (!user || !profile) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: values.first_name,
          age: values.age,
        })
        .eq("profile_id", user.id);

      if (error) throw error;

      // Update local state
      setProfile({ ...profile, first_name: values.first_name, age: values.age === undefined ? null : values.age });
      toast.success("Detaljer gemt!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving details");
      toast.error("Kunne ikke gemme detaljer");
    } finally {
      setSaving(false);
    }
  };

  const saveInterests = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Delete existing interests
      await supabase.from("user_interests").delete().eq("profile_id", user.id);

      // Build rows for both interests and non-interests
      const rows: { profile_id: string; interest_id: string; description: string; is_non_interest: boolean }[] = [];

      // Regular interests with descriptions
      for (const [interestId, description] of Object.entries(selectedInterestsWithDescriptions)) {
        rows.push({
          profile_id: user.id,
          interest_id: interestId,
          description: description || "",
          is_non_interest: false,
        });
      }

      // Non-interests
      for (const interestId of selectedNonInterests) {
        rows.push({
          profile_id: user.id,
          interest_id: interestId,
          description: "",
          is_non_interest: true,
        });
      }

      if (rows.length > 0) {
        const { error } = await supabase.from("user_interests").insert(rows);
        if (error) throw error;
      }
      toast.success("Interesser gemt!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving interests");
      toast.error("Kunne ikke gemme interesser");
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          city: address.city,
          coordinates: coordinates ? `POINT(${coordinates.lat} ${coordinates.lng})` : null,
          postcode: address.postcode || null,
          country: address.country || null,
          country_code: address.country_code || null,
        })
        .eq("profile_id", user.id);

      if (error) throw error;

      // Update local state
      setProfile({ ...profile, city: address.city });
      toast.success("Placering gemt!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving location");
      toast.error("Kunne ikke gemme placering");
    } finally {
      setSaving(false);
    }
  };

  // Interest toggle function (updated for descriptions)
  const toggleInterest = (interestId: string) => {
    // Remove from non-interests if it was there
    if (selectedNonInterests.has(interestId)) {
      const next = new Set(selectedNonInterests);
      next.delete(interestId);
      setSelectedNonInterests(next);
    }

    const newSelection = { ...selectedInterestsWithDescriptions };
    if (interestId in newSelection) {
      delete newSelection[interestId];
    } else {
      newSelection[interestId] = "";
    }
    setSelectedInterestsWithDescriptions(newSelection);
  };

  // Toggle non-interest
  const toggleNonInterest = (interestId: string) => {
    // Remove from regular interests if it was there
    if (interestId in selectedInterestsWithDescriptions) {
      const newSelection = { ...selectedInterestsWithDescriptions };
      delete newSelection[interestId];
      setSelectedInterestsWithDescriptions(newSelection);
    }

    const next = new Set(selectedNonInterests);
    if (next.has(interestId)) {
      next.delete(interestId);
    } else {
      next.add(interestId);
    }
    setSelectedNonInterests(next);
  };

  // Update description for selected interest
  const updateInterestDescription = (interestId: string, description: string) => {
    setSelectedInterestsWithDescriptions({
      ...selectedInterestsWithDescriptions,
      [interestId]: description,
    });
  };

  // Remove interest
  const removeInterest = (interestId: string) => {
    const newSelection = { ...selectedInterestsWithDescriptions };
    delete newSelection[interestId];
    setSelectedInterestsWithDescriptions(newSelection);
  };

  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout
      header={
        <div className="flex items-center justify-between">
          <PageTitle>Rediger profil</PageTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/profile" })}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbage
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
      <ErrorBanner message={error} />

      <ProfileTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
      />

      {/* Tab Content */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "details" && (
          <DetailsTabPanel
            initialValues={{
              first_name: profileData?.profile?.first_name || "",
              age: profileData?.profile?.age || undefined,
            }}
            onSave={saveDetails}
            saving={saving}
          >
            {user && (
              <AvatarEditor
                profileId={user.id}
                avatarUrl={avatarUrl}
                onAvatarChange={(url) => {
                  setAvatarUrl(url);
                  if (profile) setProfile({ ...profile, avatar_url: url });
                }}
                profileName={profile?.first_name || undefined}
              />
            )}
          </DetailsTabPanel>
        )}

        {activeTab === "interests" && (
          <InterestsTabPanel
            selectedInterestsWithDescriptions={selectedInterestsWithDescriptions}
            toggleInterest={toggleInterest}
            removeInterest={removeInterest}
            updateInterestDescription={updateInterestDescription}
            onSave={saveInterests}
            saving={saving}
            showNonInterests
            selectedNonInterests={selectedNonInterests}
            toggleNonInterest={toggleNonInterest}
          />
        )}

        {activeTab === "location" && (
          <LocationTabPanel
            coordinates={coordinates}
            address={address}
            setAddress={setAddress}
            setCoordinates={setCoordinates}
            onSave={saveLocation}
            saving={saving}
          />
        )}

        {/* Connections Tab */}
        {activeTab === "connections" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Tilslutninger</h2>
              <p className="text-gray-600 mb-6">
                Forbind dine konti for at vise mere om dig selv
              </p>
            </div>

            {/* Strava Section */}
            <div className="border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#FC4C02] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Strava</h3>
                  <p className="text-sm text-gray-500">Forbind din Strava-konto for at vise aktiviteter og sportsinteresser</p>
                </div>
              </div>

              {stravaLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Indlæser...
                </div>
              ) : stravaConnection ? (
                <div className="space-y-6">
                  {/* Connected status */}
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">
                          Forbundet som{" "}
                          {(stravaConnection.athlete_data as unknown as StravaAthlete)?.firstname || "ukendt"}{" "}
                          {(stravaConnection.athlete_data as unknown as StravaAthlete)?.lastname || ""}
                        </p>
                        <p className="text-sm text-green-600">
                          Tilsluttet {new Date(stravaConnection.created_at).toLocaleDateString("da-DK")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disconnectStrava}
                      disabled={saving}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Link2Off className="w-3.5 h-3.5 mr-1.5" />
                      Afbryd
                    </Button>
                  </div>

                  {/* Reimport activities button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reimportStravaActivities}
                    disabled={reimporting}
                    className="w-full"
                  >
                    {reimporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Importerer aktiviteter...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Importér aktiviteter til feed
                      </>
                    )}
                  </Button>

                  {/* Stats summary — computed from all activity posts */}
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
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                          Aktivitetsstatistik ({activityPosts.length} aktiviteter)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {stats.map((s) => (
                            <StatCard
                              key={s.label}
                              label={s.label}
                              value={s.count}
                              unit="aktiviteter"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Recent activities */}
                  {stravaActivities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                        Seneste aktiviteter
                      </h4>
                      <div className="space-y-2">
                        {stravaActivities.slice(0, 5).map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                {activity.name}
                                {activity.visibility && activity.visibility !== "everyone" && (
                                  <span title="Privat aktivitet — kun synlig for dig" className="inline-flex">
                                    <Lock className="h-3 w-3 text-gray-400" aria-label="Privat aktivitet" />
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {activity.sport_type} · {new Date(activity.start_date_local).toLocaleDateString("da-DK")}
                              </p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-medium">{(activity.distance / 1000).toFixed(1)} km</p>
                              <p className="text-xs text-gray-500">
                                {Math.floor(activity.moving_time / 60)} min
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <a
                        href={`https://www.strava.com/athletes/${stravaConnection.strava_athlete_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-sm text-[#FC4C02] hover:underline"
                      >
                        Se alle på Strava
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Import interests from Strava */}
                  {stravaImportableSports.length > 0 && (
                    <div className="border-t pt-6">
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Zap className="w-4 h-4" />
                        Importér interesser fra Strava
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Vi fandt disse sportsgrene fra dine Strava-aktiviteter:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {stravaImportableSports.map((sport) => (
                          <span
                            key={sport.interest_id}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-orange-50 text-orange-700 border border-orange-200"
                          >
                            {sport.interest_da}
                          </span>
                        ))}
                      </div>
                      <Button
                        onClick={importStravaInterests}
                        disabled={importingInterests}
                        size="sm"
                      >
                        {importingInterests ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Importerer...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 mr-1.5" />
                            Importér {stravaImportableSports.length} interesse{stravaImportableSports.length > 1 ? "r" : ""}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={connectStrava}
                  className="bg-[#FC4C02] hover:bg-[#e04402] text-white"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Tilslut Strava
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </DefaultLayout>
  );
}

function ProtectedProfile() {
  return (
    <ProtectedRoute>
      <ProfileEdit />
    </ProtectedRoute>
  );
}

function StatCard({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: number;
  unit: string;
  detail?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1">
        {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
      </p>
      {detail && <p className="text-sm text-gray-600">{detail}</p>}
    </div>
  );
}

export const Route = createFileRoute("/profile-edit")({
  component: ProtectedProfile,
  validateSearch: (search: Record<string, unknown>): ProfileEditSearch => ({
    tab: (search.tab as TabType) || undefined,
    strava_error: search.strava_error as string | undefined,
    strava_connected: search.strava_connected as string | undefined,
  }),
  loader: async () => {
    // Get user directly from Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error("Unauthorized");
    }
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Fetch profile data
    const profileData = await fetchProfileWithInterests(user.id);

    console.log("Profile data loaded:", profileData);
    return {
      user,
      profileData,
    };
  },
});

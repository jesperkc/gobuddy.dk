import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/form/TextInput";
import { required, useForm } from "@modular-forms/react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { IAddress, LocationPicker } from "@/components/LocationPicker";
import { DefaultLayout } from "@/components/AppShell";
import { InterestsPicker } from "@/components/InterestsPicker";
import { NonInterestsPicker } from "@/components/NonInterestsPicker";
import { fetchProfileWithInterests } from "../../src/lib/fetchProfileWithInterests";
import { toast } from "sonner";
import { ErrorBanner } from "@/components/ErrorBanner";

// Reuse interfaces from profile.tsx
export interface UserProfile {
  profile_id: string;
  first_name: string | null;
  last_name?: string | null;
  age: number | null;
  email: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  created_at: string | null;
}

// Form interfaces
type DetailsForm = {
  first_name: string;
  age: number | undefined;
};

type TabType = "details" | "interests" | "location";

export function ProfileEdit() {
  const { profileData } = Route.useLoaderData(); // Access preloaded data
  const { user, loading: loadingUser } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("details");

  // Data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

  // Form setup for details
  const [, { Form, Field }] = useForm<DetailsForm>({
    initialValues: {
      first_name: profileData?.profile?.first_name || "",
      age: profileData?.profile.age || undefined,
    },
  });

  useEffect(() => {
    const handleData = async () => {
      if (!user?.id || loadingUser) return; // Wait for auth to fully initialize
      // console.log("Fetching profile data for user:", user.id, loadingUser);

      try {
        setProfile(profileData.profile);

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

  // Tab navigation
  const tabs = [
    { id: "details" as TabType, label: "Personlige oplysninger" },
    { id: "interests" as TabType, label: "Interesser" },
    { id: "location" as TabType, label: "Placering" },
  ];

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        setActiveTab(tabs[nextIndex].id);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [activeTab, tabs],
  );

  // Save functions
  const saveDetails = async (values: DetailsForm) => {
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
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Rediger profil</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/profile" })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbage
        </Button>
      </div>

      <ErrorBanner message={error} />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div role="tablist" aria-label="Profil sektioner" className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleTabKeyDown}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium  ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {/* Details Tab */}
        {activeTab === "details" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Personlige oplysninger</h2>
            <Form onSubmit={saveDetails} className="space-y-6">
              <Field name="first_name" validate={[required("Indtast venligst et navn")]}>
                {(field, props) => (
                  <TextInput
                    {...props}
                    value={field.value}
                    error={field.error}
                    type="text"
                    // id="edit-name"
                    label="Hvad er dit navn?"
                    placeholder="Indtast et navn"
                    required
                  />
                )}
              </Field>
              <Field name="age" type="number" validate={[required("Indtast venligst din alder")]}>
                {(field, props) => (
                  <TextInput
                    {...props}
                    value={field.value}
                    error={field.error}
                    type="number"
                    label="Hvad er din alder?"
                    placeholder="Indtast din alder"
                    required
                  />
                )}
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Gemmer...
                    </>
                  ) : (
                    <>Gem ændringer</>
                  )}
                </Button>
              </div>
            </Form>
          </div>
        )}

        {/* Interests Tab */}
        {activeTab === "interests" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Interesser</h2>
            <p className="text-gray-600 mb-6">Vælg dine interesser</p>

            <InterestsPicker
              selectedInterestsWithDescriptions={selectedInterestsWithDescriptions}
              toggleInterest={toggleInterest}
              removeInterest={removeInterest}
              updateInterestDescription={updateInterestDescription}
              disabledInterestIds={selectedNonInterests}
            />

            <div className="border-t border-gray-200 mt-8 pt-8">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Ban className="w-6 h-6 text-red-500" />
                Ikke-interesser
              </h2>
              <p className="text-gray-600 mb-6">
                Vælg de ting du <strong>ikke</strong> er interesseret i — det hjælper med at finde bedre matches
              </p>

              <NonInterestsPicker
                selectedNonInterests={selectedNonInterests}
                toggleNonInterest={toggleNonInterest}
                disabledInterestIds={new Set(Object.keys(selectedInterestsWithDescriptions))}
              />
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={saveInterests} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gemmer...
                  </>
                ) : (
                  <>Gem ændringer</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Location Tab */}
        {activeTab === "location" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Placering</h2>

            <LocationPicker coordinates={coordinates} setAddress={setAddress} setCoordinates={setCoordinates} />

            <div className="flex justify-end">
              <Button onClick={saveLocation} disabled={saving || !address.city}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gemmer...
                  </>
                ) : (
                  <>Gem ændringer</>
                )}
              </Button>
            </div>
          </div>
        )}
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

export const Route = createFileRoute("/profile-edit")({
  component: ProtectedProfile,
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

import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/form/TextInput";
import { useAuth } from "../hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { required, setValues, useForm } from "@modular-forms/react";
import { InterestsPicker } from "./components/InterestsPicker";
import { IAddress, LocationPicker } from "./components/LocationPicker";

// Reuse interfaces from profile.tsx
interface UserProfile {
  profile_id: string;
  first_name: string | null;
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

interface UserInterest {
  interest_id: string;
  description: string;
  interest_da: string;
  interest_en: string;
  icon: string;
}

// Type for the unified query result from Supabase
interface ProfileWithInterestsQueryResult {
  profile_id: string;
  first_name: string | null;
  age: number | null;
  email: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  created_at: string | null;
  user_interests: Array<{
    interest_id: string;
    description: string;
    interests: {
      interest_da: string;
      interest_en: string;
      icon: string;
    } | null;
  }>;
}

// Form interfaces
type DetailsForm = {
  first_name: string;
  age: number | undefined;
};

type TabType = "details" | "interests" | "location";

// Reuse fetchProfileWithInterests from profile.tsx
async function fetchProfileWithInterests(profileId: string): Promise<{
  profile: UserProfile;
  interests: UserInterest[];
}> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        *,
        user_interests (
          interest_id,
          description,
          interests (
            interest_da,
            interest_en,
            icon
          )
        )
      `
      )
      .eq("profile_id", profileId)
      .single();

    if (error) {
      throw error;
    }

    const profileData = data as ProfileWithInterestsQueryResult;

    const profile: UserProfile = {
      profile_id: profileData.profile_id,
      first_name: profileData.first_name,
      age: profileData.age,
      email: profileData.email,
      city: profileData.city,
      latitude: profileData.latitude,
      longitude: profileData.longitude,
      postcode: profileData.postcode || "",
      country: profileData.country || "",
      country_code: profileData.country_code || "",
      created_at: profileData.created_at,
    };

    const interests: UserInterest[] = (profileData.user_interests || [])
      .filter((item) => item.interests)
      .map((item) => ({
        interest_id: item.interest_id,
        description: item.description,
        interest_da: item.interests?.interest_da || "",
        interest_en: item.interests?.interest_en || "",
        icon: item.interests?.icon || "",
      }));

    return { profile, interests };
  } catch (error) {
    console.error("Error fetching profile with interests:", error);
    throw error;
  }
}

export function ProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("details");

  // Data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form states for editing
  const [selectedInterestsWithDescriptions, setSelectedInterestsWithDescriptions] = useState<Record<string, string>>({});
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [address, setAddress] = useState<IAddress>({
    postcode: "",
    city: "",
    country: "",
    country_code: "",
  });

  // Form setup for details
  const [detailsForm, { Form, Field }] = useForm<DetailsForm>({
    initialValues: {
      first_name: profile?.first_name || undefined,
      age: profile?.age || undefined,
    },
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch profile and interests
        const { profile: profileData, interests } = await fetchProfileWithInterests(user.id);
        setProfile(profileData);

        setValues(detailsForm, {
          first_name: profileData.first_name || "",
          age: profileData.age || undefined,
        });

        // Initialize selected interests with descriptions
        const interestsWithDescriptions: Record<string, string> = {};
        interests.forEach((interest) => {
          interestsWithDescriptions[interest.interest_id] = interest.description || "";
        });
        setSelectedInterestsWithDescriptions(interestsWithDescriptions);

        // Set initial location data
        if (profileData.city) {
          // setSearchQuery(profileData.city);
          setAddress({
            postcode: "",
            city: profileData.city,
            country: "",
            country_code: "",
          });
        }
        setCoordinates({
          lat: profileData.latitude || 0,
          lng: profileData.longitude || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while fetching data");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Tab navigation
  const tabs = [
    { id: "details" as TabType, label: "Personlige oplysninger" },
    { id: "interests" as TabType, label: "Interesser" },
    { id: "location" as TabType, label: "Placering" },
  ];

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving details");
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

      // Insert new interests with descriptions
      const selectedInterestIds = Object.keys(selectedInterestsWithDescriptions);
      if (selectedInterestIds.length > 0) {
        const interestData = selectedInterestIds.map((interestId) => ({
          profile_id: user.id,
          interest_id: interestId,
          description: selectedInterestsWithDescriptions[interestId] || "",
        }));

        const { error } = await supabase.from("user_interests").insert(interestData);

        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving interests");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving location");
    } finally {
      setSaving(false);
    }
  };

  // Interest toggle function (updated for descriptions)
  const toggleInterest = (interestId: string) => {
    const newSelection = { ...selectedInterestsWithDescriptions };
    if (interestId in newSelection) {
      delete newSelection[interestId];
    } else {
      newSelection[interestId] = "";
    }
    setSelectedInterestsWithDescriptions(newSelection);
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
      <Layout>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  console.log("Profile data:", profile);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Rediger profil</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/profile" })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbage
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
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
                    id="edit-name"
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
            />
            <div className="flex justify-end">
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
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Search, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/form/TextInput";
import { Map } from "../components/Map";
import { InputWithIcon } from "@/components/ui/input-width-icon";
import { Or } from "@/components/ui/ui";
import { useAuth } from "../hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { required, setValues, useForm } from "@modular-forms/react";
import { Tables } from "database.types";

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

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode: string;
    country: string;
    country_code: string;
  };
}

interface IAddress {
  postcode: string;
  city: string;
  country: string;
  country_code: string;
}

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
  const [availableInterests, setAvailableInterests] = useState<Tables<"interests">[]>([]);
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

  // Location search state
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
          setSearchQuery(profileData.city);
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

        // Fetch available interests for selection
        const { data: interestsData, error: interestsError } = await supabase
          .from("interests")
          .select("*")
          .eq("onboarding", true)
          .order("interest_da");

        if (interestsError) throw interestsError;
        setAvailableInterests(interestsData || []);
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

  // Location functions (from location.tsx)
  const handleGeolocation = () => {
    if ("geolocation" in navigator) {
      setIsLocating(true);
      setLocationError("");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          getAddress({ lat: latitude, lng: longitude });
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Could not get your location. Please try again or enter your city manually.");
          setIsLocating(false);
        }
      );
    }
  };

  const getAddress = async (location: { lat: number; lng: number }) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=da_DK`
    );
    const addressData = await response.json();
    if (addressData.address) {
      setAddress({
        postcode: addressData.address.postcode || "",
        city: addressData.address.city || "",
        country: addressData.address.country || "",
        country_code: addressData.address.country_code || "",
      });
      setSearchQuery(addressData.address.city || "");
    }
  };

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data.filter((result) => result.address.city || result.address.town || result.address.village));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(true);

    // Debounce search
    setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleLocationSelect = (result: SearchResult) => {
    const cityName = result.address.city || result.address.town || result.address.village || "";
    setAddress({
      postcode: result.address.postcode,
      city: cityName,
      country: result.address.country,
      country_code: result.address.country_code,
    });
    setSearchQuery(cityName);
    setCoordinates({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    });
    setShowSuggestions(false);
    setSearchResults([]);
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
    <Layout>
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

              {/* Interest Selection Grid */}
              <div className="flex gap-3 mb-8">
                {availableInterests.map((interest) => (
                  <button
                    key={interest.interest_id}
                    onClick={() => toggleInterest(interest.interest_id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      interest.interest_id in selectedInterestsWithDescriptions
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 hover:border-blue-500"
                    }`}
                  >
                    {interest.interest_da}
                  </button>
                ))}
              </div>

              {/* Selected Interests with Descriptions */}
              {Object.keys(selectedInterestsWithDescriptions).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Valgte interesser</h3>
                  <p className="text-gray-600 mb-4">Tilføj beskrivelser til dine interesser for at fortælle andre mere om dig</p>

                  <div className="space-y-4">
                    {Object.keys(selectedInterestsWithDescriptions).map((interestId) => {
                      const interest = availableInterests.find((i) => i.interest_id === interestId);
                      if (!interest) return null;

                      return (
                        <div key={interestId} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{interest.interest_da}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInterest(interestId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Fjern
                            </Button>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Beskriv hvor, hvordan og hvor ofte du udøver denne interesse...
                            </label>
                            <textarea
                              value={selectedInterestsWithDescriptions[interestId]}
                              onChange={(e) => updateInterestDescription(interestId, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              rows={3}
                              maxLength={500}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {selectedInterestsWithDescriptions[interestId].length}/500 tegn
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

              <div className="space-y-6">
                <div className="h-[300px] w-full rounded-lg overflow-hidden shadow-md mb-6">
                  <Map coords={coordinates} />
                </div>

                <Button onClick={handleGeolocation} disabled={isLocating}>
                  {isLocating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Henter placering...
                    </>
                  ) : (
                    <>
                      <MapPin size={20} className="mr-2" />
                      Del min placering
                    </>
                  )}
                </Button>

                {locationError && <div className="text-red-600 text-sm">{locationError}</div>}
                <Or />

                <div className="search-container relative">
                  <div className="relative">
                    <InputWithIcon
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Søg efter din by"
                      autoComplete="off"
                      icon={<Search />}
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
                    )}
                  </div>

                  {showSuggestions && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                      {searchResults.map((result, index) => {
                        const city = result.address.city || result.address.town || result.address.village;
                        const location = `${city}, ${result.address.country}`;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSelect(result)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-gray-400" />
                              <span>{location}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

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
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

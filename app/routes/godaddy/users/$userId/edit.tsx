import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "../../../../../src/components/ui/button";
import { TextInput } from "../../../../../src/components/form/TextInput";
import { required, useForm } from "@modular-forms/react";
import { RoleProtectedRoute } from "../../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../../src/components/AdminShell";
import { supabase, supabaseAdmin, adminAuthClient } from "../../../../../src/lib/supabase";
import { IAddress, LocationPicker } from "../../../../../src/components/LocationPicker";
import { InterestsPicker } from "../../../../../src/components/InterestsPicker";
import { fetchProfileWithInterests } from "../../../../../src/lib/fetchProfileWithInterests";
import type { Database } from "../../../../../database.types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type UserRole = Database["public"]["Enums"]["app_role"];

// Use database types for accurate typing
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Form interfaces
type DetailsForm = {
  first_name: string;
  last_name: string;
  age: number | undefined;
  email: string;
};

type TabType = "details" | "interests" | "location" | "roles";

export function EditUser() {
  const { userId, profileData, userRoles } = Route.useLoaderData();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("details");

  // Data state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>(userRoles || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const [, { Form, Field }] = useForm<DetailsForm>({
    initialValues: {
      first_name: profileData?.profile?.first_name || "",
      last_name: profileData?.profile?.last_name || "",
      age: profileData?.profile?.age || undefined,
      email: profileData?.profile?.email || "",
    },
  });

  useEffect(() => {
    const handleData = async () => {
      if (!profileData) return;

      try {
        // Cast to Profile type since fetchProfileWithInterests returns UserProfile
        setProfile(profileData.profile as Profile);

        // Initialize selected interests with descriptions
        const interestsWithDescriptions: Record<string, string> = {};
        profileData.interests.forEach((interest) => {
          interestsWithDescriptions[interest.interest_id] = interest.description || "";
        });
        setSelectedInterestsWithDescriptions(interestsWithDescriptions);

        // Set initial location data
        if (profileData.profile.city) {
          setAddress({
            postcode: profileData.profile.postcode || "",
            city: profileData.profile.city,
            country: profileData.profile.country || "",
            country_code: profileData.profile.country_code || "",
          });
        }
        setCoordinates({
          lat: profileData.profile.latitude || 0,
          lng: profileData.profile.longitude || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "En fejl opstod under indlæsning af data");
        console.error("Error handling data:", err);
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
    { id: "roles" as TabType, label: "Roller" },
  ];

  // Save functions
  const saveDetails = async (values: DetailsForm) => {
    if (!profile) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          age: values.age,
          // email: values.email,
        })
        .eq("profile_id", profile.profile_id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        first_name: values.first_name,
        last_name: values.last_name,
        age: values.age === undefined ? null : values.age,
        // email: values.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl ved gemning af detaljer");
    } finally {
      setSaving(false);
    }
  };

  const saveInterests = async () => {
    if (!profile) return;

    try {
      setSaving(true);

      // Delete existing interests
      await supabase.from("user_interests").delete().eq("profile_id", profile.profile_id);

      // Insert new interests with descriptions
      const selectedInterestIds = Object.keys(selectedInterestsWithDescriptions);
      if (selectedInterestIds.length > 0) {
        const interestData = selectedInterestIds.map((interestId) => ({
          profile_id: profile.profile_id,
          interest_id: interestId,
          description: selectedInterestsWithDescriptions[interestId] || "",
        }));

        const { error } = await supabase.from("user_interests").insert(interestData);

        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl ved gemning af interesser");
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async () => {
    if (!profile) return;

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
        .eq("profile_id", profile.profile_id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        city: address.city,
        postcode: address.postcode || null,
        country: address.country || null,
        country_code: address.country_code || null,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl ved gemning af placering");
    } finally {
      setSaving(false);
    }
  };

  const saveRoles = async () => {
    if (!profile?.profile_id) return;

    try {
      setSaving(true);

      // Delete existing roles
      await supabase.from("user_roles").delete().eq("user_id", profile.profile_id);

      // Insert new roles
      if (roles.length > 0) {
        const roleData = roles.map((role) => ({
          user_id: profile.profile_id,
          role,
        }));

        const { error } = await supabase.from("user_roles").insert(roleData);
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl ved gemning af roller");
    } finally {
      setSaving(false);
    }
  };

  // Interest management functions
  const toggleInterest = (interestId: string) => {
    const newSelection = { ...selectedInterestsWithDescriptions };
    if (interestId in newSelection) {
      delete newSelection[interestId];
    } else {
      newSelection[interestId] = "";
    }
    setSelectedInterestsWithDescriptions(newSelection);
  };

  const updateInterestDescription = (interestId: string, description: string) => {
    setSelectedInterestsWithDescriptions({
      ...selectedInterestsWithDescriptions,
      [interestId]: description,
    });
  };

  const removeInterest = (interestId: string) => {
    const newSelection = { ...selectedInterestsWithDescriptions };
    delete newSelection[interestId];
    setSelectedInterestsWithDescriptions(newSelection);
  };

  // Role management functions
  const toggleRole = (role: UserRole) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  // Delete user function
  const handleDeleteUser = async () => {
    const targetId = profile?.profile_id || userId;
    if (!targetId) return;

    const userName =
      profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.first_name
          ? profile.first_name
          : profile?.email || "Ukendt bruger";

    const confirmed = confirm(`Er du sikker på at du vil slette ${userName}? Dette kan ikke fortrydes og vil fjerne alle brugerens data.`);

    if (!confirmed) return;

    try {
      setDeleting(true);

      // Step 1: Delete from messages table (FK dependency on profiles)
      const { error: messagesError } = await supabaseAdmin.from("messages").delete().or(`sender_id.eq.${targetId},receiver_id.eq.${targetId}`);
      if (messagesError) console.error("Error deleting messages:", messagesError);

      // Step 2: Delete from user_interests table
      const { error: interestsError } = await supabaseAdmin.from("user_interests").delete().eq("profile_id", targetId);
      if (interestsError) console.error("Error deleting interests:", interestsError);

      // Step 3: Delete from user_roles table
      const { error: rolesError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", targetId);
      if (rolesError) console.error("Error deleting roles:", rolesError);

      // Step 4: Delete from profiles table
      const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("profile_id", targetId);
      if (profileError) {
        console.error("Error deleting profile:", profileError);
        throw new Error("Kunne ikke slette profil: " + profileError.message);
      }

      // Step 5: Delete from auth.users using adminAuthClient
      const { error: authError } = await adminAuthClient.deleteUser(targetId);
      if (authError) console.error("Error deleting auth user:", authError);

      // Navigate back to users list on success
      navigate({ to: "/godaddy/users" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der opstod en fejl ved sletning af brugeren");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <RoleProtectedRoute requiredRole="admin">
        <AdminShell>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </AdminShell>
      </RoleProtectedRoute>
    );
  }

  const userName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.first_name
        ? profile.first_name
        : profile?.email || userId || "Ukendt bruger";

  // If no profile data was found, show a minimal page with delete option
  if (!profileData) {
    return (
      <RoleProtectedRoute requiredRole="admin">
        <AdminShell
          title="Rediger bruger"
          crumbs={[{ label: "Brugere", href: "/godaddy/users" }, { label: `Bruger: ${userId}` }]}
        >
          {error && <div role="alert" className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-6">
            Brugerprofil blev ikke fundet i databasen. Du kan stadig slette brugeren fra systemet.
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600 mb-2"><strong>User ID:</strong> {userId}</p>
          </div>

          <Button variant="destructive" size="sm" onClick={handleDeleteUser} disabled={deleting || saving} className="mt-4">
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sletter...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Slet bruger
              </>
            )}
          </Button>
        </AdminShell>
      </RoleProtectedRoute>
    );
  }

  return (
    <RoleProtectedRoute requiredRole="admin">
      <AdminShell
        title={`Rediger bruger`}
        crumbs={[{ label: "Brugere", href: "/godaddy/users" }, { label: `Rediger bruger: ${userName}` }]}
      >
        {error && <div role="alert" className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium  ${
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
        <div className="bg-white shadow rounded-lg p-6">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Personlige oplysninger</h2>
              <Form onSubmit={saveDetails} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Field name="first_name" validate={[required("Indtast venligst et fornavn")]}>
                    {(field, props) => (
                      <TextInput
                        {...props}
                        value={field.value}
                        error={field.error}
                        type="text"
                        label="Fornavn"
                        placeholder="Indtast fornavn"
                        required
                      />
                    )}
                  </Field>
                  <Field name="last_name" validate={[required("Indtast venligst et efternavn")]}>
                    {(field, props) => (
                      <TextInput
                        {...props}
                        value={field.value}
                        error={field.error}
                        type="text"
                        label="Efternavn"
                        placeholder="Indtast efternavn"
                        required
                      />
                    )}
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* <Field name="email" validate={[required("Indtast venligst en email")]}>
                    {(field, props) => (
                      <TextInput
                        {...props}
                        value={field.value}
                        error={field.error}
                        type="email"
                        label="Email"
                        placeholder="Indtast email"
                        required
                      />
                    )}
                  </Field> */}
                  <Field name="age" type="number">
                    {(field, props) => (
                      <TextInput
                        {...props}
                        value={field.value}
                        error={field.error}
                        type="number"
                        label="Alder"
                        placeholder="Indtast alder"
                      />
                    )}
                  </Field>
                </div>
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
              <p className="text-gray-600 mb-6">Administrer brugerens interesser</p>

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
              <p className="text-gray-600 mb-6">Administrer brugerens placering</p>

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

          {/* Roles Tab */}
          {activeTab === "roles" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Brugerroller</h2>
              <p className="text-gray-600 mb-6">Administrer brugerens roller og tilladelser</p>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="admin-role"
                    checked={roles.includes("admin")}
                    onChange={() => toggleRole("admin")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="admin-role" className=" font-medium text-gray-700">
                    Administrator
                  </label>
                  <span className="text-xs text-gray-500">- Fuld adgang til alle funktioner</span>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="moderator-role"
                    checked={roles.includes("moderator")}
                    onChange={() => toggleRole("moderator")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="moderator-role" className=" font-medium text-gray-700">
                    Moderator
                  </label>
                  <span className="text-xs text-gray-500">- Kan moderere indhold og brugere</span>
                </div>

                {roles.length === 0 && (
                  <div className=" text-gray-500 italic">Ingen særlige roller tildelt - brugeren har almindelige brugerrettigheder</div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={saveRoles} disabled={saving}>
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
        <Button variant="destructive" size="sm" onClick={handleDeleteUser} disabled={deleting || saving}>
          {deleting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sletter...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Slet bruger
            </>
          )}
        </Button>
      </AdminShell>
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute("/godaddy/users/$userId/edit")({
  component: EditUser,
  loader: async ({ params }) => {
    const { userId } = params;

    if (!userId) {
      throw new Error("User ID is required");
    }

    let profileData = null;
    let userRoles: UserRole[] = [];

    try {
      profileData = await fetchProfileWithInterests(userId);

      const { data: userRolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", (profileData.profile as Profile).profile_id);

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
      }

      userRoles = userRolesData?.map((r) => r.role) || [];
    } catch (error) {
      console.error("Profile not found, continuing with delete option:", error);
    }

    return {
      userId,
      profileData,
      userRoles,
    };
  },
});

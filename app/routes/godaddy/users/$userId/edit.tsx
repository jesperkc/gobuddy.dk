import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { AdminShell } from "@/components/AdminShell";
import { supabase, supabaseAdmin, adminAuthClient } from "@/lib/supabase";
import { IAddress } from "@/components/LocationPicker";
import { fetchProfileWithInterests } from "@/lib/fetchProfileWithInterests";
import type { Database } from "../../../../../database.types";
import { toast } from "sonner";
import {
  ProfileTabBar,
  AvatarEditor,
  DetailsTabPanel,
  InterestsTabPanel,
  LocationTabPanel,
  SaveButton,
  type DetailsFormValues,
} from "@/components/profile-edit";

type UserRole = Database["public"]["Enums"]["app_role"];

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
      if (!profileData) return;

      try {
        setProfile(profileData.profile as Profile);
        setAvatarUrl(profileData.profile.avatar_url || null);

        // Initialize selected interests and non-interests
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
  const saveDetails = async (values: DetailsFormValues) => {
    if (!profile) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          age: values.age,
        })
        .eq("profile_id", profile.profile_id);

      if (error) throw error;

      setProfile({
        ...profile,
        first_name: values.first_name,
        last_name: values.last_name,
        age: values.age === undefined ? null : values.age,
      });
      toast.success("Detaljer gemt!");
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

      // Build rows for both interests and non-interests
      const rows: { profile_id: string; interest_id: string; description: string; is_non_interest: boolean }[] = [];

      for (const [interestId, description] of Object.entries(selectedInterestsWithDescriptions)) {
        rows.push({
          profile_id: profile.profile_id,
          interest_id: interestId,
          description: description || "",
          is_non_interest: false,
        });
      }

      for (const interestId of selectedNonInterests) {
        rows.push({
          profile_id: profile.profile_id,
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

      setProfile({
        ...profile,
        city: address.city,
        postcode: address.postcode || null,
        country: address.country || null,
        country_code: address.country_code || null,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
      });
      toast.success("Placering gemt!");
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

      await supabase.from("user_roles").delete().eq("user_id", profile.profile_id);

      if (roles.length > 0) {
        const roleData = roles.map((role) => ({
          user_id: profile.profile_id,
          role,
        }));

        const { error } = await supabase.from("user_roles").insert(roleData);
        if (error) throw error;
      }
      toast.success("Roller gemt!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl ved gemning af roller");
    } finally {
      setSaving(false);
    }
  };

  // Interest management functions
  const toggleInterest = (interestId: string) => {
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

  const toggleNonInterest = (interestId: string) => {
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
        <div className="mb-6">
          <ProfileTabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as TabType)}
            ariaLabel="Bruger sektioner"
          />
        </div>

        {/* Tab Content */}
        <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="bg-white shadow rounded-lg p-6">
          {activeTab === "details" && (
            <DetailsTabPanel
              initialValues={{
                first_name: profileData?.profile?.first_name || "",
                age: profileData?.profile?.age || undefined,
              }}
              onSave={saveDetails}
              saving={saving}
            >
              {profile && (
                <AvatarEditor
                  profileId={profile.profile_id}
                  avatarUrl={avatarUrl}
                  onAvatarChange={(url) => {
                    setAvatarUrl(url);
                    if (profile) setProfile({ ...profile, avatar_url: url });
                  }}
                  profileName={profile.first_name || undefined}
                  client={supabaseAdmin}
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

          {/* Roles Tab — admin-only */}
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

              <div className="mt-6">
                <SaveButton onClick={saveRoles} saving={saving} />
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

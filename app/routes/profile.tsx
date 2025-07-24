import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { Button } from "../../src/components/ui/button";
import LoadingValue from "../../src/components/LoadingValue";

function Profile() {
  const { user } = useAuth();
  const { profile, loading, error, loadProfile } = useUserProfileStore();

  // Create userInterests array from profile.interests for compatibility
  const userInterests =
    profile?.interests?.map((interest, index) => ({
      interest_id: index.toString(),
      interest_da: interest,
      description: interest,
    })) || [];

  useEffect(() => {
    if (user && !profile) {
      loadProfile(user);
    }
  }, [user, profile, loadProfile]);

  return (
    <DefaultLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Min profil</h1>
          <Button asChild variant="ghost" size="sm">
            <Link to="/profile">Rediger profil</Link>
          </Button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

        <div className="grid grid-cols-1 gap-4">
          <div className="flex w-full gap-4">
            <div className="p-6 bg-white shadow-xs rounded-lg border w-1/3">
              <h2 className="text-lg font-medium text-gray-700">Personlige oplysninger</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Navn</span>
                  <p className="font-medium">
                    <LoadingValue value={profile && profile.first_name} loading={loading}></LoadingValue>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Alder</span>
                  <p className="font-medium">
                    <LoadingValue value={profile && profile.age} loading={loading} width={8}></LoadingValue>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email</span>
                  <p className="font-medium">
                    <LoadingValue value={user?.email} loading={loading} width={"1/2"}></LoadingValue>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">By</span>
                  <p className="font-medium">
                    <LoadingValue value={profile && profile.city} loading={loading} width={"1/2"}></LoadingValue>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Medlem siden</span>
                  <p className="font-medium">
                    <LoadingValue
                      value={profile && profile.created_at ? new Date(profile.created_at).toLocaleDateString("da-DK") : ""}
                      loading={loading}
                      width={50}
                    ></LoadingValue>
                  </p>
                </div>
              </div>
            </div>

            {userInterests && userInterests.length > 0 && (
              <div className="p-6 bg-white shadow-xs rounded-lg border w-2/3">
                <h2 className="text-lg font-medium text-gray-700">Interesser</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {userInterests.map((interest) => (
                    <span
                      key={interest.interest_id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      title={interest.description}
                    >
                      {interest.interest_da}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { MapPin, ArrowRight, Compass, UserPen } from "lucide-react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { Button } from "../../src/components/ui/button";
import { safeDate } from "../../src/lib/ssr-utils";

function HomePage() {
  const { user } = useAuth();
  const { profile, loadProfile } = useUserProfileStore();

  useEffect(() => {
    if (user && !profile) {
      loadProfile(user);
    }
  }, [user, profile, loadProfile]);

  const getGreeting = () => {
    return safeDate.getGreeting("Hej");
  };

  const interests = profile?.user_interests || [];
  const hasInterests = interests.length > 0;
  const hasLocation = !!profile?.city;
  const profileComplete = !!profile?.first_name && !!profile?.age && hasInterests && hasLocation;

  return (
    <DefaultLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-3xl">
            {getGreeting()}, {profile?.first_name || "Ven"}
          </h1>
          {hasLocation && (
            <p className="text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {profile.city}
            </p>
          )}
        </div>

        {/* What are you into? — Interest highlights */}
        {hasInterests && (
          <div>
            <h2 className="text-lg font-medium mb-3">Dine interesser</h2>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest.interest_id}
                  className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-medium"
                >
                  {interest.interests.interest_da}
                </span>
              ))}
            </div>
            <Link
              to="/profile-edit"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mt-3"
            >
              Rediger interesser
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Find buddies CTA */}
        {profileComplete && (
          <Link
            to="/discover"
            className="block rounded-xl border border-blue-200 bg-blue-50 p-6 text-center hover:bg-blue-100 transition-colors"
          >
            <Compass className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h2 className="text-lg font-medium mb-1">Find din næste buddy</h2>
            <p className="text-gray-600 text-sm max-w-sm mx-auto">
              Se folk i nærheden der deler dine interesser
            </p>
          </Link>
        )}

        {!profileComplete && (
          <Link
            to="/discover"
            className="block rounded-xl border border-dashed border-gray-300 p-6 text-center hover:border-gray-400 transition-colors"
          >
            <Compass className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h2 className="text-lg font-medium mb-1">Find din næste buddy</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Gør din profil komplet for bedre matches
            </p>
          </Link>
        )}

        {/* Profile completion nudge */}
        {!profileComplete && (
          <div className="rounded-xl bg-gray-50 p-5">
            <h3 className="font-medium mb-3">Gør din profil klar</h3>
            <p className="text-sm text-gray-500 mb-4">
              Jo mere du deler, jo bedre kan vi finde de rigtige buddies til dig.
            </p>
            <div className="space-y-2">
              {!profile?.first_name && (
                <ProfileTask label="Tilføj dit navn" to="/profile-edit" />
              )}
              {!profile?.age && (
                <ProfileTask label="Angiv din alder" to="/profile-edit" />
              )}
              {!hasInterests && (
                <ProfileTask label="Vælg dine interesser" to="/profile-edit" />
              )}
              {!hasLocation && (
                <ProfileTask label="Angiv din placering" to="/profile-edit" />
              )}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/discover">
              <Compass className="w-4 h-4" />
              Find buddies
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/profile">
              <UserPen className="w-4 h-4" />
              Min profil
            </Link>
          </Button>
        </div>
      </div>
    </DefaultLayout>
  );
}

function ProfileTask({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-gray-400 transition-colors"
    >
      <span className="text-sm">{label}</span>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </Link>
  );
}

function ProtectedHomePage() {
  return (
    <ProtectedRoute redirectTo="/">
      <HomePage />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/home")({
  component: ProtectedHomePage,
});

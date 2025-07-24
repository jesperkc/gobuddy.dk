import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, User, Heart, MapPin, Users, MessageCircle } from "lucide-react";
import { DefaultLayout } from "../../src/components/AppShell";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../src/store/userProfile";
import { Button } from "../../src/components/ui/button";
import { safeDate } from "../../src/lib/ssr-utils";

function HomePage() {
  const { user } = useAuth();
  const { profile, loading, loadProfile } = useUserProfileStore();

  useEffect(() => {
    if (user && !profile) {
      loadProfile(user);
    }
  }, [user, profile, loadProfile]);

  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Indlæser hjemmeside...</p>
        </div>
      </DefaultLayout>
    );
  }

  const getGreeting = () => {
    return safeDate.getGreeting("Hej");
  };

  return (
    <DefaultLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {profile?.first_name || "Ven"}!
          </h1>
          <p className="text-gray-600">Velkommen til GoBuddy</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-800">0</p>
            <p className="text-sm text-blue-600">Nye venner</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <MessageCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-800">0</p>
            <p className="text-sm text-green-600">Beskeder</p>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <User className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium">Din profil</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span>{profile?.email || user?.email || "Ikke angivet"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Alder:</span>
              <span>{profile?.age ? `${profile.age} år` : "Ikke angivet"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lokation:</span>
              <span>
                {profile?.city && profile?.country
                  ? `${profile.city}, ${profile.country}`
                  : profile?.city || profile?.country || "Ikke angivet"}
              </span>
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <Heart className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium">Dine interesser</h3>
          </div>
          {profile?.interests && profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.slice(0, 6).map((interest, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {interest}
                </span>
              ))}
              {profile.interests.length > 6 && (
                <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">+{profile.interests.length - 6} flere</span>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">Ingen interesser angivet endnu</p>
          )}
        </div>

        {/* Location Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <MapPin className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium">Find venner i nærheden</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Opdater din lokation for at finde venner med lignende interesser i dit område.</p>
          <Button variant="outline" className="w-full">
            Find venner i nærheden
          </Button>
        </div>

        {/* Profile Completion Reminder */}
        {(!profile?.first_name || !profile?.age || !profile?.interests?.length) && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Fuldfør din profil</h4>
            <p className="text-sm text-yellow-800 mb-3">En komplet profil hjælper dig med at finde bedre matches og nye venner.</p>
            <Button variant="outline" size="sm" className="text-yellow-800 border-yellow-300 hover:bg-yellow-100">
              Fuldfør profil
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="font-medium">Hurtige handlinger</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <User className="w-4 h-4 mr-2" />
              Se min profil
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Find nye venner
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageCircle className="w-4 h-4 mr-2" />
              Mine beskeder
            </Button>
          </div>
        </div>
      </div>
    </DefaultLayout>
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

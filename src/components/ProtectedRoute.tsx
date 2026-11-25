import React, { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { User } from "@supabase/supabase-js";
import { useAuth } from "../contexts/AuthContext";
import { isBrowser, useClientEffect, useHydrated } from "../lib/ssr-utils";
import { UserProfile, useUserProfileStore } from "@/store/userProfile";
import { Button } from "@/components/ui/button";

/** Props handed to the render function of a `ProtectedRoute`. */
export interface AuthedProps {
  user: User;
  profile: UserProfile;
}

interface ProtectedRouteProps {
  children: (props: AuthedProps) => ReactNode;
  redirectTo?: string;
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">{label}</p>
      </div>
    </div>
  );
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectTo = "/login" }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const profile = useUserProfileStore((s) => s.profile);
  const profileLoading = useUserProfileStore((s) => s.loading);
  const profileError = useUserProfileStore((s) => s.error);
  const loadProfile = useUserProfileStore((s) => s.loadProfile);
  const hasMounted = useHydrated();

  // Profile belongs to this user (guards against a stale profile after switching accounts)
  const ownProfile = user && profile?.profile_id === user.id ? profile : null;

  useClientEffect(() => {
    if (user && !ownProfile && !profileLoading && !profileError) {
      loadProfile(user);
    }
  }, [user, ownProfile, profileLoading, profileError, loadProfile]);

  // On server or before client hydration, always show loading state
  // This prevents authentication state mismatches between server and client
  if (!isBrowser || !hasMounted) {
    return <LoadingScreen label="Indlæser..." />;
  }

  // Show loading state while checking authentication (client-side only)
  if (loading) {
    return <LoadingScreen label="Tjekker login..." />;
  }

  // Redirect to login if not authenticated (client-side only)
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Only block on the initial profile load. Later refreshes via loadProfile
  // keep the page mounted with the previous profile until the new one arrives.
  if (!ownProfile) {
    if (profileError && !profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4 text-center">
            <p className="text-gray-600">Vi kunne ikke hente din profil.</p>
            <Button onClick={() => loadProfile(user)}>Prøv igen</Button>
          </div>
        </div>
      );
    }
    return <LoadingScreen label="Indlæser profil..." />;
  }

  return <>{children({ user, profile: ownProfile })}</>;
};

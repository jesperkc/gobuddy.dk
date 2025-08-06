import React, { ReactNode, useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { isBrowser, useClientEffect } from "../lib/ssr-utils";

interface UnauthedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const UnauthedRoute: React.FC<UnauthedRouteProps> = ({ children, redirectTo = "/home" }) => {
  const { isAuthenticated, loading } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);

  // Track client-side mounting to prevent hydration mismatches
  useClientEffect(() => {
    setHasMounted(true);
  }, []);

  // On server or before client hydration, always show loading state
  // This prevents authentication state mismatches between server and client
  if (!isBrowser || !hasMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication (client-side only)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (client-side only)
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Render children if authenticated (client-side only)
  return <>{children}</>;
};

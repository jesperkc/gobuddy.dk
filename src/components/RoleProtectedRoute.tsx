import React, { ReactNode, useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { isBrowser, useClientEffect } from "../lib/ssr-utils";
import type { Database } from "../../database.types";

type UserRole = Database["public"]["Enums"]["app_role"];

interface RoleProtectedRouteProps {
  children: ReactNode;
  requiredRole: UserRole;
  redirectTo?: string;
  fallbackTo?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = "/login",
  fallbackTo = "/home",
}) => {
  const { isAuthenticated, hasRole, loading, userRoles, user } = useAuth();
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
          <p className="text-gray-600">Indlæser...</p>
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
          <p className="text-gray-600">Tjekker login...</p>
        </div>
      </div>
    );
  }
  // Redirect to login if not authenticated (client-side only)
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Show access denied if authenticated but doesn't have required role
  if (!hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Adgang nægtet</h3>
            <p className=" text-gray-500 mb-6">Du har ikke tilladelse til at se denne side. Der kræves {requiredRole} rettigheder.</p>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent  font-medium rounded-md text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
            >
              Gå tilbage
            </button>
            {/* <Navigate to={fallbackTo} replace /> */}
          </div>
        </div>
      </div>
    );
  }

  // Render children if authenticated and has required role (client-side only)
  return <>{children}</>;
};

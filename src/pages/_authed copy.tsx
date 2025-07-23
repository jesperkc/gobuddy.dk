// import { createRoute, Outlet } from "@tanstack/react-router";
// import { Login } from "./login";
import { createContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { SignupRequestData } from "./signup";
import { Database } from "database.types";
// import { Route as rootRoute } from "./__root";

// Define the shape of our auth context
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (signupData: SignupRequestData) => Promise<{ error: Error | null; user: User | null }>;
  saveInterests: (interests: string[], userId: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
}

// Create the auth context with default values
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  loading: true,
  error: null,
  login: async () => ({ error: null }),
  signup: async () => ({ error: null, user: null }),
  saveInterests: async () => ({ error: null }),
  logout: async () => ({ error: null }),
  refreshSession: async () => {},
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        console.log("Session data:", data);
        console.log("Session error:", error);
        if (error) {
          throw error;
        }

        setSession(data.session);

        if (data.session) {
          // Get user data if session exists
          const { data: userData, error: userError } = await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          setUser(userData.user);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while checking authentication");
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("AuthContext onAuthStateChange", event, newSession);
      setSession(newSession);

      if (newSession && newSession.user) {
        setUser(newSession.user);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    // Clean up the subscription when the component unmounts
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setSession(data.session);
      setUser(data.user);

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during login";
      setError(errorMessage);
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (signupData: SignupRequestData) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp(signupData);

      if (error) {
        throw error;
      }

      return { error: null, user: data.user };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during signup";
      setError(errorMessage);
      return { error: err as Error, user: null };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setSession(null);
      setUser(null);

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during logout";
      setError(errorMessage);
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      setSession(data.session);

      if (data.session) {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        setUser(userData.user);
      }
    } catch (err) {
      console.error("Error refreshing session:", err);
      setError(err instanceof Error ? err.message : "An error occurred while refreshing session");
    } finally {
      setLoading(false);
    }
  };

  // Create the auth context value
  const value = {
    isAuthenticated: !!session,
    user,
    session,
    loading,
    error,
    login,
    signup,
    saveInterests,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Route, and child routes that requires authentication.
 * also note the that route prefaced with the underscore character is not
 * included in the path of the child routes.
 *
 * If the user is not authenticated, the user is redirected to the login page.
 */
// export const Route = createRoute({
//   getParentRoute: () => rootRoute,
//   id: "_authed",
//   beforeLoad: ({ context }) => {
//     // Check if the user is authenticated
//     if (!context.user) {
//       throw new Error("Not authenticated");
//     }
//     return {};
//   },
//   errorComponent: ({ error }) => {
//     if (error.message === "Not authenticated") {
//       return <Login />;
//     }

//     throw error;
//   },
//   component: () => (
//     <AuthProvider>
//       <Outlet />
//     </AuthProvider>
//   ),
// });

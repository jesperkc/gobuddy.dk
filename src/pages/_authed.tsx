import { createContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, fetchUserRoles } from "../lib/supabase";
import { SignupRequestData } from "./signup";
import { Enums } from "../../database.types";

// Define the shape of our auth context
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  userRoles: Enums<"app_role">[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (signupData: SignupRequestData) => Promise<{ error: Error | null; user: User | null }>;
  logout: () => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
  hasRole: (role: Enums<"app_role">) => boolean;
  hasPermission: (permission: Enums<"app_permission">) => boolean;
}

// Create the auth context with default values
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  userRoles: [],
  loading: true,
  error: null,
  login: async () => ({ error: null }),
  signup: async () => ({ error: null, user: null }),
  logout: async () => ({ error: null }),
  refreshSession: async () => {},
  hasRole: () => false,
  hasPermission: () => false,
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<Enums<"app_role">[]>([]);
  const [userPermissions, setUserPermissions] = useState<Enums<"app_permission">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user roles and permissions - NON-BLOCKING for regular users
  const fetchUserRolesAndPermissions = async (userId: string) => {
    try {
      // Fetch roles and permissions separately to avoid Promise.all failure
      const roles = await fetchUserRoles(userId).catch((err) => {
        console.error("Role fetch failed, using empty array:", err);
        return [];
      });

      // const permissions = await getUserPermissions(userId).catch((err) => {
      //   console.error("Permission fetch failed, using empty array:", err);
      //   return [];
      // });

      setUserRoles(roles);
      // setUserPermissions(permissions);
    } catch (err) {
      console.error("Critical error in fetchUserRolesAndPermissions:", err);
      setUserRoles([]);
      setUserPermissions([]);
      // Don't rethrow - this should not break authentication for regular users
    }
  };

  // Helper functions
  const hasRole = (role: Enums<"app_role">): boolean => {
    return userRoles.includes(role);
  };

  const hasPermission = (permission: Enums<"app_permission">): boolean => {
    return userPermissions.includes(permission);
  };

  // Check for existing session on initial load - SSR compatible
  useEffect(() => {
    const checkSession = async () => {
      // Only run on client side to avoid SSR hydration issues
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      try {
        // Get the current session
        const { data, error } = await supabase.auth.getSession();
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
          // Fetch user roles and permissions - NON-BLOCKING
          if (userData.user?.id) {
            // Use setTimeout to make this truly non-blocking
            setTimeout(() => {
              fetchUserRolesAndPermissions(userData.user.id);
            }, 0);
          }
        } else {
          // Clear roles when no session
          setUserRoles([]);
          setUserPermissions([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while checking authentication");
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener - only on client side
    if (typeof window !== "undefined") {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        setSession(newSession);

        if (newSession && newSession.user) {
          setUser(newSession.user);
          // Fetch user roles and permissions - NON-BLOCKING
          // Use setTimeout to make this truly non-blocking
          setTimeout(() => {
            fetchUserRolesAndPermissions(newSession.user.id);
          }, 0);
        } else {
          setUser(null);
          // Clear roles when no user
          setUserRoles([]);
          setUserPermissions([]);
        }

        setLoading(false);
      });

      // Clean up the subscription when the component unmounts
      return () => {
        authListener.subscription.unsubscribe();
      };
    }
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

      // Fetch user roles and permissions after login
      if (data.user?.id) {
        await fetchUserRolesAndPermissions(data.user.id);
      }

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
      setUserRoles([]);
      setUserPermissions([]);

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
        // Fetch user roles and permissions after refresh
        if (userData.user?.id) {
          await fetchUserRolesAndPermissions(userData.user.id);
        }
      } else {
        setUser(null);
        setUserRoles([]);
        setUserPermissions([]);
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
    userRoles,
    loading,
    error,
    login,
    signup,
    logout,
    refreshSession,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// SSR-compatible AuthProvider that initializes properly on both server and client
export function SSRCompatibleAuthProvider({ children }: AuthProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // On server side and before hydration, provide a minimal auth state
  if (!isHydrated && typeof window === "undefined") {
    const serverValue = {
      isAuthenticated: false,
      user: null,
      session: null,
      userRoles: [],
      loading: true,
      error: null,
      login: async () => ({ error: null }),
      signup: async () => ({ error: null, user: null }),
      logout: async () => ({ error: null }),
      refreshSession: async () => {},
      hasRole: () => false,
      hasPermission: () => false,
    };

    return <AuthContext.Provider value={serverValue}>{children}</AuthContext.Provider>;
  }

  // Use the full AuthProvider on client side
  return <AuthProvider>{children}</AuthProvider>;
}

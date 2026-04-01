import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useClientEffect, isBrowser } from "../lib/ssr-utils";
import type { Database } from "../../database.types";

type UserRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: UserRole[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<{ error: AuthError | null }>;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  clearError: () => void;
  loadUserRoles: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // SSR-safe state initialization - start with loading=true on client, false on server
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(isBrowser); // Only show loading on client
  const [error, setError] = useState<string | null>(null);

  // Helper function to load user roles
  const loadUserRoles = async (userId: string) => {
    if (!isBrowser) {
      const errorMessage = "Loading user roles can only be performed on the client";
      console.error(errorMessage);
      setError(errorMessage);
      return;
    }
    console.log("Load user roles if user exists:", userId);
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

      if (error) {
        throw error;
      }

      const roles = data?.map((item) => item.role as UserRole) || [];
      setUserRoles(roles);
    } catch (err) {
      console.error("Error loading user roles:", err);
      setError("Failed to load user roles");
    } finally {
      setLoading(false);
    }
  };

  // Client-only authentication initialization and state changes
  useClientEffect(() => {
    // Get initial session - only runs on client
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          setError(error.message);
        } else {
          setSession(session);
          setUser(session?.user ?? null);

          // Load user roles if user exists
          if (session?.user) {
            await loadUserRoles(session.user.id);
          } else {
            setUserRoles([]);
          }
        }
      } catch (err) {
        console.error("Error getting initial session:", err);
        setError("Failed to get session");
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes - only runs on client
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log("Auth state change:", event, session);

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Load user roles for authenticated users
      if (session?.user) {
        // await loadUserRoles(session.user.id);
      } else {
        setUserRoles([]);
      }

      // Clear any previous errors on successful auth state change
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Only proceed if we're on the client
    if (!isBrowser) {
      const errorMessage = "Login can only be performed on the client";
      setError(errorMessage);
      return { error: new Error(errorMessage) as AuthError };
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      }

      return { error };
    } catch {
      const errorMessage = "An unexpected error occurred during login";
      setError(errorMessage);
      return { error: new Error(errorMessage) as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Only proceed if we're on the client
    if (!isBrowser) {
      const errorMessage = "Logout can only be performed on the client";
      setError(errorMessage);
      return { error: new Error(errorMessage) as AuthError };
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
      }

      return { error };
    } catch {
      const errorMessage = "An unexpected error occurred during logout";
      setError(errorMessage);
      return { error: new Error(errorMessage) as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const hasRole = (role: UserRole): boolean => {
    return userRoles.includes(role);
  };

  const isAdmin = hasRole("admin");

  const value: AuthContextType = {
    user,
    session,
    userRoles,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    isAdmin,
    clearError,
    loadUserRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

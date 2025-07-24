import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useClientEffect, isBrowser } from "../lib/ssr-utils";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<{ error: AuthError | null }>;
  isAuthenticated: boolean;
  clearError: () => void;
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
  const [loading, setLoading] = useState(isBrowser); // Only show loading on client
  const [error, setError] = useState<string | null>(null);

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
      console.log("Auth state change:", event, session);

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

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

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import { redirect } from "@tanstack/react-router";
import { supabase, adminRoute } from "./supabase";

/**
 * SSR-compatible authentication guard for regular authenticated routes
 * Checks if user is authenticated and redirects to login if not
 */
export const authGuard = async () => {
  try {
    // Get the current session
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Auth session error:", error);
      throw redirect({
        to: "/login",
        statusCode: 302,
      });
    }

    // If no session or user, redirect to login
    if (!data.session?.user) {
      throw redirect({
        to: "/login",
        statusCode: 302,
      });
    }

    return {
      user: data.session.user,
      session: data.session,
    };
  } catch (err) {
    // If it's already a redirect, re-throw it
    if (err && typeof err === "object" && "to" in err) {
      throw err;
    }

    console.error("Auth guard error:", err);
    throw redirect({
      to: "/login",
      statusCode: 302,
    });
  }
};

/**
 * SSR-compatible admin authentication guard
 * Checks if user is authenticated and has admin role
 */
export const adminAuthGuard = async () => {
  try {
    // First check basic authentication
    const authResult = await authGuard();

    // Check if user has admin role
    const adminResult = await adminRoute(authResult.user.id);

    if (!adminResult.isAuthorized) {
      // Redirect to profile if not admin
      throw redirect({
        to: adminResult.redirectTo || "/profile",
        statusCode: 403,
      });
    }

    return {
      user: authResult.user,
      session: authResult.session,
    };
  } catch (err) {
    // If it's already a redirect, re-throw it
    if (err && typeof err === "object" && "to" in err) {
      throw err;
    }

    console.error("Admin auth guard error:", err);
    throw redirect({
      to: "/login",
      statusCode: 302,
    });
  }
};

/**
 * Check if user is already authenticated for routes that should redirect authenticated users
 * (like login, signup, index)
 */
export const guestOnlyGuard = async () => {
  try {
    const { data } = await supabase.auth.getSession();

    // If user is already authenticated, redirect to appropriate page
    if (data.session?.user) {
      throw redirect({
        to: "/home",
        statusCode: 302,
      });
    }

    return {};
  } catch (err) {
    // If it's already a redirect, re-throw it
    if (err && typeof err === "object" && "to" in err) {
      throw err;
    }

    // For guest-only routes, auth errors should not block access
    console.warn("Guest guard warning:", err);
    return {};
  }
};

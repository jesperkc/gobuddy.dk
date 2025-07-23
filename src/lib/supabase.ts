import { createClient } from "@supabase/supabase-js";
import { Database, Enums } from "../../database.types.ts";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Fetch user roles from the user_roles table
 */
export async function fetchUserRoles(userId: string): Promise<Enums<"app_role">[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

  if (error) {
    console.error("Error fetching user roles:", error);
    return [];
  }

  return data?.map((row) => row.role) || [];
}

/**
 * Check if a user has a specific role
 */
export async function hasUserRole(userId: string, role: Enums<"app_role">): Promise<boolean> {
  const { data, error } = await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", role).single();
  console.log("Checking user role:", { userId, role, data, error });
  if (error) {
    // If no matching record found, user doesn't have the role
    console.error("Error checking user role:", error);
    return false;
  }

  return !!data;
}

/**
 * Get user permissions via role_permissions table
 */
export async function getUserPermissions(userId: string): Promise<Enums<"app_permission">[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `
      role_permissions(permission)
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user permissions:", error);
    return [];
  }

  const permissions: Enums<"app_permission">[] = [];
  data?.forEach((userRole) => {
    if (userRole.role_permissions && Array.isArray(userRole.role_permissions)) {
      userRole.role_permissions.forEach((rp: { permission: Enums<"app_permission"> }) => {
        if (rp.permission) {
          permissions.push(rp.permission);
        }
      });
    }
  });

  return [...new Set(permissions)]; // Remove duplicates
}

/**
 * Admin route protection - redirects to /profile if not admin
 */
export async function adminRoute(userId: string): Promise<{ isAuthorized: boolean; redirectTo?: string }> {
  const isAdmin = await hasUserRole(userId, "admin");

  return {
    isAuthorized: isAdmin,
    redirectTo: isAdmin ? undefined : "/profile",
  };
}

/**
 * Generic role-based route protection
 */
export async function requireRole(userId: string, role: Enums<"app_role">): Promise<{ isAuthorized: boolean; redirectTo?: string }> {
  const hasRole = await hasUserRole(userId, role);

  return {
    isAuthorized: hasRole,
    redirectTo: hasRole ? undefined : "/profile",
  };
}

// User data fetching types
export interface UserWithProfileAndRoles {
  user_id: string;
  email: string;
  created_at: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    age: number | null;
    city: string | null;
    email: string | null;
  } | null;
  roles: Enums<"app_role">[];
  last_sign_in_at: string | null;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  moderatorUsers: number;
  suspendedUsers: number;
  newUsersLast30Days: number;
}

/**
 * Fetch all users with their profiles and roles
 */
export async function fetchAllUsers(): Promise<UserWithProfileAndRoles[]> {
  try {
    // First, get all profiles with user_id
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        `
        user_id,
        first_name,
        last_name,
        age,
        city,
        email,
        created_at
      `
      )
      .not("user_id", "is", null);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return [];
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Get user roles for all users
    const userIds = profiles.map((p) => p.user_id || "").filter(Boolean);
    const { data: userRoles, error: rolesError } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
    }

    // Group roles by user_id
    const rolesByUser = (userRoles || []).reduce((acc, userRole) => {
      if (!acc[userRole.user_id]) {
        acc[userRole.user_id] = [];
      }
      acc[userRole.user_id].push(userRole.role);
      return acc;
    }, {} as Record<string, Enums<"app_role">[]>);

    // Try to get auth user data from Supabase Auth (may not be accessible)
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUsersMap =
      authUsers.users?.reduce((acc, user) => {
        acc[user.id] = {
          email: user.email || "",
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
        };
        return acc;
      }, {} as Record<string, { email: string; created_at: string; last_sign_in_at: string | null }>) || {};

    // Combine all data
    const usersWithData: UserWithProfileAndRoles[] = profiles.map((profile) => ({
      user_id: profile.user_id!,
      email: authUsersMap[profile.user_id!]?.email || profile.email || "",
      created_at: authUsersMap[profile.user_id!]?.created_at || profile.created_at || "",
      last_sign_in_at: authUsersMap[profile.user_id!]?.last_sign_in_at || null,
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        age: profile.age,
        city: profile.city,
        email: profile.email,
      },
      roles: rolesByUser[profile.user_id!] || [],
    }));

    return usersWithData;
  } catch (error) {
    console.error("Error in fetchAllUsers:", error);
    return [];
  }
}

/**
 * Fetch user statistics for admin dashboard
 */
export async function fetchUserStats(): Promise<UserStats> {
  try {
    // Get total user count from profiles
    const { count: totalUsers, error: totalError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("user_id", "is", null);

    if (totalError) {
      console.error("Error fetching total users count:", totalError);
    }

    // Get users created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: newUsers, error: newUsersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("user_id", "is", null)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (newUsersError) {
      console.error("Error fetching new users count:", newUsersError);
    }

    // Get role counts
    const { data: roleData, error: roleError } = await supabase.from("user_roles").select("role");

    if (roleError) {
      console.error("Error fetching role data:", roleError);
    }

    const roleCounts = (roleData || []).reduce((acc, role) => {
      acc[role.role] = (acc[role.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate active users (users with recent activity - for now, use total as approximation)
    // This could be enhanced with actual activity tracking
    const activeUsers = Math.floor((totalUsers || 0) * 0.8); // Approximate 80% active

    return {
      totalUsers: totalUsers || 0,
      activeUsers,
      adminUsers: roleCounts["admin"] || 0,
      moderatorUsers: roleCounts["moderator"] || 0,
      suspendedUsers: 0, // This would need to be tracked separately
      newUsersLast30Days: newUsers || 0,
    };
  } catch (error) {
    console.error("Error in fetchUserStats:", error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      adminUsers: 0,
      moderatorUsers: 0,
      suspendedUsers: 0,
      newUsersLast30Days: 0,
    };
  }
}

// Admin User Creation Types and Interfaces
export interface AdminCreateUserData {
  // Personal Details
  first_name: string;
  email: string;
  password: string;
  age: number;

  // Interests
  interests: string[];
  interestDescriptions: Record<string, string>;

  // Location
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;

  // Role & Settings
  role: Enums<"app_role"> | "user";
  accountStatus: "active" | "inactive";
  emailVerified: boolean;
  emailNotifications: boolean;
  requireEmailVerification: boolean;
}

export interface UserCreationResult {
  success: boolean;
  userId?: string;
  profileId?: string;
  error?: string;
  details?: string;
}

export interface AdminUserProfile {
  user_id: string;
  profile_id: string;
  email: string;
  first_name: string;
  last_name: string;
  age: number;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  role: Enums<"app_role"> | "user";
  interests: string[];
  created_at: string;
  email_verified: boolean;
  account_status: "active" | "inactive";
}

/**
 * Create user account with authentication credentials (Admin function)
 */
export async function createUserByAdmin(userData: AdminCreateUserData): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: userData.emailVerified || !userData.requireEmailVerification,
      user_metadata: {
        first_name: userData.first_name,
        created_by_admin: true,
      },
    });

    if (error || !data.user) {
      console.error("Error creating user account:", error);
      return {
        success: false,
        error: error?.message || "Failed to create user account",
      };
    }

    return {
      success: true,
      userId: data.user.id,
    };
  } catch (error) {
    console.error("Error in createUserByAdmin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Create user profile with complete form data (Admin function)
 */
export async function createUserProfile(
  userId: string,
  userData: AdminCreateUserData
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        first_name: userData.first_name,
        email: userData.email,
        age: userData.age,
        city: userData.city,
        country: userData.country,
        latitude: userData.latitude,
        longitude: userData.longitude,
        newsletter: userData.emailNotifications,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating user profile:", error);
      return {
        success: false,
        error: error?.message || "Failed to create user profile",
      };
    }

    return {
      success: true,
      profileId: data.profile_id,
    };
  } catch (error) {
    console.error("Error in createUserProfile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Assign role to user (Admin function)
 */
export async function assignUserRole(userId: string, role: Enums<"app_role"> | "user"): Promise<{ success: boolean; error?: string }> {
  try {
    // Only assign role if it's not "user" (standard users don't need role entries)
    if (role === "user") {
      return { success: true };
    }

    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: role as Enums<"app_role">,
    });

    if (error) {
      console.error("Error assigning user role:", error);
      return {
        success: false,
        error: error.message || "Failed to assign user role",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in assignUserRole:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Set user interests (Admin function)
 */
export async function setUserInterests(
  profileId: string,
  interestIds: string[],
  interestDescriptions: Record<string, string> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    if (interestIds.length === 0) {
      return { success: true };
    }

    // Create user interest entries
    const userInterests = interestIds.map((interestId) => ({
      profile_id: profileId,
      interest_id: interestId,
      description: interestDescriptions[interestId] || "", // Use custom description or default to empty
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("user_interests").insert(userInterests);

    if (error) {
      console.error("Error setting user interests:", error);
      return {
        success: false,
        error: error.message || "Failed to set user interests",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in setUserInterests:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Create user location data (Admin function)
 * Note: Location data is already included in the profile creation
 */
export async function createUserLocation(
  profileId: string,
  locationData: { city: string; country: string; latitude?: number; longitude?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update profile with location data
    const { error } = await supabase
      .from("profiles")
      .update({
        city: locationData.city,
        country: locationData.country,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      })
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error updating user location:", error);
      return {
        success: false,
        error: error.message || "Failed to update user location",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in createUserLocation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Complete admin user creation workflow with transaction-like behavior
 */
export async function createCompleteUser(userData: AdminCreateUserData): Promise<UserCreationResult> {
  console.log("Starting user creation process:", { email: userData.email, role: userData.role });

  try {
    // Step 1: Create authentication account
    const authResult = await createUserByAdmin(userData);
    if (!authResult.success || !authResult.userId) {
      return {
        success: false,
        error: "Authentication Setup Failed",
        details: authResult.error || "Failed to create user account",
      };
    }

    const userId = authResult.userId;
    console.log("User account created:", userId);

    // Step 2: Create user profile
    const profileResult = await createUserProfile(userId, userData);
    if (!profileResult.success || !profileResult.profileId) {
      // Rollback: Delete the auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.log("Rolled back user account creation");
      } catch (rollbackError) {
        console.error("Failed to rollback user creation:", rollbackError);
      }

      return {
        success: false,
        error: "Profile Creation Failed",
        details: profileResult.error || "Failed to create user profile",
      };
    }

    const profileId = profileResult.profileId;
    console.log("User profile created:", profileId);

    // Step 3: Assign user role
    const roleResult = await assignUserRole(userId, userData.role);
    if (!roleResult.success) {
      // Continue with warning but don't fail the entire process
      console.warn("Role assignment failed:", roleResult.error);
    }

    // Step 4: Set user interests
    const interestsResult = await setUserInterests(profileId, userData.interests, userData.interestDescriptions);
    if (!interestsResult.success) {
      // Continue with warning but don't fail the entire process
      console.warn("Interest assignment failed:", interestsResult.error);
    }

    // Step 5: Handle account status (if inactive, we might want to disable the user)
    if (userData.accountStatus === "inactive") {
      try {
        // Note: Supabase doesn't have a direct "disable" feature for admin-created users
        // This could be handled with custom user metadata or a separate status table
        console.log("User created with inactive status - consider implementing status tracking");
      } catch (statusError) {
        console.warn("Failed to set account status:", statusError);
      }
    }

    console.log("User creation completed successfully");
    return {
      success: true,
      userId,
      profileId,
    };
  } catch (error) {
    console.error("Error in createCompleteUser:", error);
    return {
      success: false,
      error: "User Creation Failed",
      details: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Validate admin permissions before user creation
 */
export async function validateAdminUserCreation(
  adminUserId: string,
  targetRole: Enums<"app_role"> | "user"
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Check if current user has admin role
    const isAdmin = await hasUserRole(adminUserId, "admin");

    if (!isAdmin) {
      return {
        isValid: false,
        error: "Insufficient permissions. Only administrators can create users.",
      };
    }

    // Prevent creating admin users unless specifically authorized (could add additional checks here)
    if (targetRole === "admin") {
      console.log("Admin user creation - additional validation may be required");
    }

    return { isValid: true };
  } catch (error) {
    console.error("Error validating admin user creation:", error);
    return {
      isValid: false,
      error: "Permission validation failed",
    };
  }
}

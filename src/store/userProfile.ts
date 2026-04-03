import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface UserProfile {
  id: string;
  first_name: string;
  age: number;
  email: string;
  coordinates: string | null;
  postcode: string;
  city: string;
  country: string;
  country_code: string;
  longitude?: number;
  latitude?: number;
  user_interests: {
    interest_id: string;
    description: string;
    is_non_interest: boolean;
    interests: {
      interest_id: string;
      interest_da: string;
      interest_en: string;
      icon: string;
    };
  }[];
  newsletter: boolean;
  created_at: string;
  updated_at?: string;
}

interface UserProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadProfile: (user: User) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  loadProfile: async (user: User) => {
    const { setLoading, setError, setProfile } = get();

    setLoading(true);
    setError(null);

    try {
      // First, check if we have user metadata
      // if (user.user_metadata && Object.keys(user.user_metadata)) {
      //   const profile: UserProfile = {
      //     id: user.id,
      //     email: user.email || "",
      //     first_name: user.user_metadata.first_name || "",
      //     age: user.user_metadata.age || 0,
      //     coordinates: user.user_metadata.coordinates || null,
      //     postcode: user.user_metadata.postcode || "",
      //     city: user.user_metadata.city || "",
      //     country: user.user_metadata.country || "",
      //     country_code: user.user_metadata.country_code || "",
      //     longitude: user.user_metadata.longitude,
      //     latitude: user.user_metadata.latitude,
      //     user_interests: user.user_metadata.user_interests || [],
      //     newsletter: user.user_metadata.newsletter || false,
      //     created_at: user.created_at,
      //     updated_at: user.updated_at,
      //   };

      //   setProfile(profile);
      //   return;
      // }

      // If no user_metadata, try to fetch from a profiles table (if it exists)
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
        *,
        user_interests (
          interest_id,
          description,
          is_non_interest,
          interests (
            interest_da,
            interest_en,
            icon
          )
        )
        `
        )
        .eq("profile_id", user.id)
        .single();
      console.log("From database:", data, error);

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found"
        throw error;
      }

      if (data) {
        console.log("Profile loaded from database:", data);
        setProfile(data as UserProfile);
      } else {
        // Create a minimal profile from user data
        const profile: UserProfile = {
          id: user.id,
          first_name: "",
          age: 0,
          coordinates: null,
          postcode: "",
          city: "",
          country: "",
          country_code: "",
          user_interests: [],
          newsletter: false,
          created_at: user.created_at,
          updated_at: user.updated_at,
          email: user.email || "",
        };

        setProfile(profile);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
      console.error("Error loading profile:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { profile, setLoading, setError, setProfile } = get();

    if (!profile) {
      setError("No profile to update");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to update in profiles table first
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: profile.id, ...updates })
        .eq("id", profile.id);

      if (profileError && profileError.code !== "42P01") {
        // 42P01 is "relation does not exist"
        throw profileError;
      }

      // Update user metadata as fallback or primary method
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { ...updates },
      });

      if (metadataError) {
        throw metadataError;
      }

      // Update local state
      setProfile({ ...profile, ...updates });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile";
      console.error("Error updating profile:", err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  },

  clearProfile: () => {
    set({
      profile: null,
      loading: false,
      error: null,
    });
  },
}));

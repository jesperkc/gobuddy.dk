import { supabase } from "@/lib/supabase";
import { UserProfile } from "../../app/routes/profile-edit";

interface UserInterest {
  interest_id: string;
  description: string;
  is_non_interest: boolean;
  interest_da: string;
  interest_en: string;
  icon: string;
}

// Type for the unified query result from Supabase
interface ProfileWithInterestsQueryResult {
  profile_id: string;
  first_name: string | null;
  age: number | null;
  email: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  avatar_url: string | null;
  created_at: string | null;
  user_interests: Array<{
    interest_id: string;
    description: string;
    is_non_interest: boolean;
    interests: {
      interest_da: string;
      interest_en: string;
      icon: string;
    } | null;
  }>;
}

// Reuse fetchProfileWithInterests from profile.tsx
export async function fetchProfileWithInterests(profileId: string): Promise<{
  profile: UserProfile;
  interests: UserInterest[];
}> {
  try {
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
      .eq("profile_id", profileId)
      .single();

    if (error) {
      throw error;
    }

    const profileData = data as ProfileWithInterestsQueryResult;

    const profile: UserProfile = {
      profile_id: profileData.profile_id,
      first_name: profileData.first_name,
      age: profileData.age,
      email: profileData.email,
      city: profileData.city,
      latitude: profileData.latitude,
      longitude: profileData.longitude,
      postcode: profileData.postcode || "",
      country: profileData.country || "",
      country_code: profileData.country_code || "",
      avatar_url: profileData.avatar_url,
      created_at: profileData.created_at,
    };

    const interests: UserInterest[] = (profileData.user_interests || [])
      .filter((item) => item.interests)
      .map((item) => ({
        interest_id: item.interest_id,
        description: item.description,
        is_non_interest: item.is_non_interest,
        interest_da: item.interests?.interest_da || "",
        interest_en: item.interests?.interest_en || "",
        icon: item.interests?.icon || "",
      }));

    return { profile, interests };
  } catch (error) {
    console.error("Error fetching profile with interests:", error);
    throw error;
  }
}

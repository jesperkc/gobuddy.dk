import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  profile_id: string;
  first_name: string | null;
  age: number | null;
  email: string | null;
  city: string | null;
  created_at: string | null;
}

interface UserInterest {
  interest_id: string;
  description: string;
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
  created_at: string | null;
  user_interests: Array<{
    interest_id: string;
    description: string;
    interests: {
      interest_da: string;
      interest_en: string;
      icon: string;
    } | null;
  }>;
}

/**
 * Fetches both profile data and user interests in a single API call
 * @param profileId - The profile ID to fetch data for
 * @returns Promise with complete profile and interests data
 */
async function fetchProfileWithInterests(profileId: string): Promise<{
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

    // Extract profile data
    const profile: UserProfile = {
      profile_id: profileData.profile_id,
      first_name: profileData.first_name,
      age: profileData.age,
      email: profileData.email,
      city: profileData.city,
      created_at: profileData.created_at,
    };

    // Transform the joined interests data
    const interests: UserInterest[] = (profileData.user_interests || [])
      .filter((item) => item.interests) // Filter out items without joined interest data
      .map((item) => ({
        interest_id: item.interest_id,
        description: item.description,
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

export function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch profile data and interests when user is authenticated
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);

        // Fetch both profile data and interests in a single API call
        const { profile: profileData, interests } = await fetchProfileWithInterests(user!.id);

        setProfile(profileData);
        setUserInterests(interests);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while fetching user data");
        console.error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileData();
    }
  }, [user]);

  return (
    <Layout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Min profil</h1>
          <Button asChild variant="ghost" size="sm">
            <Link to="/profile/edit">Rediger profil</Link>
          </Button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

        <div className="grid grid-cols-1 gap-4">
          <div className="flex w-full gap-4">
            <div className="p-6 bg-white shadow-sm rounded-lg border w-1/3">
              <h2 className="text-lg font-medium text-gray-700">Personlige oplysninger</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Navn</span>
                  <p className="font-medium">
                    <LoadingValue value={profile && profile.first_name} loading={loading}></LoadingValue>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Alder</span>
                  <p className="font-medium">
                    <LoadingValue value={profile && profile.age} loading={loading} width={8}></LoadingValue>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email</span>
                  <p className="font-medium">
                    <LoadingValue value={user?.email} loading={loading} width={"1/2"}></LoadingValue>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">By</span>
                  <p className="font-medium">
                    <LoadingValue value={profile && profile.city} loading={loading} width={"1/2"}></LoadingValue>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Medlem siden</span>
                  <p className="font-medium">
                    <LoadingValue
                      value={profile && profile.created_at ? new Date(profile.created_at).toLocaleDateString("da-DK") : ""}
                      loading={loading}
                      width={50}
                    ></LoadingValue>
                  </p>
                </div>
              </div>
            </div>

            {userInterests && userInterests.length > 0 && (
              <div className="p-6 bg-white shadow-sm rounded-lg border w-2/3">
                <h2 className="text-lg font-medium text-gray-700">Interesser</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {userInterests.map((interest) => (
                    <span
                      key={interest.interest_id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      title={interest.description}
                    >
                      {interest.interest_da}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const LoadingValue = ({
  value,
  loading,
  width = "auto",
}: {
  value: string | number | undefined | null;
  loading: boolean;
  width?: string | number;
}) => {
  return loading ? <Skeleton className={`w-${width}`}>&nbsp;</Skeleton> : value;
};

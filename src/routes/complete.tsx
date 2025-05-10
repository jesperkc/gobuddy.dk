import { SplitScreen } from "../components/SplitScreen";
import { useOnboardingStore } from "../store/onboarding";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export function Complete() {
  const { name, email, age, interests, location, coordinates } =
    useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saveProfile = async () => {
      try {
        // Save profile data
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("No authenticated user found");

        // Save profile data
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: user.id,
          first_name: name,
          email,
          age,
          location: coordinates
            ? `POINT(${coordinates.lng} ${coordinates.lat})`
            : null,
          city: location,
          has_completed_profile_setup: true,
        });

        if (profileError) throw profileError;

        // Save user interests
        const { data: interestsData, error: interestsError } = await supabase
          .from("interests")
          .select("interest_id, interest_en")
          .in("interest_en", interests);

        if (interestsError) throw interestsError;

        const interestIds = interestsData.map((i) => i.interest_id);

        if (interestIds.length > 0) {
          const { error: userInterestsError } = await supabase
            .from("user_interests")
            .insert(
              interestIds.map((interest_id) => ({
                profile_id: user.id,
                interest_id,
              }))
            );

          if (userInterestsError) throw userInterestsError;
        }
        // navigate({ to: "/completed" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    saveProfile();
  }, [email, name, age, interests, location, coordinates]);

  return (
    <SplitScreen>
      <div className="text-center">
        <div className="inline-flex items-center justify-center">
          Saving profile
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </div>
    </SplitScreen>
  );
}

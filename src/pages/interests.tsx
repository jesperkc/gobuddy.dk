import { createRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SplitScreen } from "../components/layout/SplitScreen";
import { useOnboardingStore } from "../store/onboarding";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Tables } from "database.types";
import { Route as rootRoute } from "./__root";

export function Interests() {
  const navigate = useNavigate();
  const { interests, setInterests } = useOnboardingStore();
  const [availableInterests, setAvailableInterests] = useState<Tables<"interests">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from("interests").select("*").eq("onboarding", true).order("interest_da");

        if (error) {
          throw error;
        }

        setAvailableInterests(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while fetching interests");
        console.error("Error fetching interests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterests();
  }, []);

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  return (
    <SplitScreen>
      <div>
        <h1 className="text-2xl font-bold mb-6">Hvad er dine interesser?</h1>
        <p className="text-gray-600 mb-6">Vælg herunder</p>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {availableInterests.map((interest) => (
              <button
                key={interest.interest_id}
                onClick={() => toggleInterest(interest.interest_id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  interests.includes(interest.interest_id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 hover:border-blue-500"
                }`}
              >
                {interest.interest_da}
              </button>
            ))}
          </div>
        )}
        <p className="text-gray-600 mb-6 text-sm">Mangler du nogle kan du nemt tilføje dem senere</p>

        <div className="flex justify-end">
          <Button type="button" variant={"secondary"} onClick={() => navigate({ to: "/signup/details" })}>
            Tilbage
          </Button>
          <Button type="submit" disabled={interests.length === 0} onClick={() => navigate({ to: "/signup/location" })} className="ml-auto">
            Videre
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </SplitScreen>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup/interests",
  component: Interests,
});

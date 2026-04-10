import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/PageTitle";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SplitScreen } from "../../src/components/SplitScreen";
import { useOnboardingStore } from "../../src/store/onboarding";
import { Button } from "../../src/components/ui/button";
import { UnauthedRoute } from "@/components/UnauthedRoute";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Tables } from "database.types";
import { OnboardingStepper } from "@/components/OnboardingStepper";

function Interests() {
  const navigate = useNavigate();
  const { interests, setInterests } = useOnboardingStore();
  const [availableInterests, setAvailableInterests] = useState<Tables<"interests">[]>([]);

  useEffect(() => {
    const fetchInterests = async () => {
      const { data, error } = await supabase
        .from("interests")
        .select("*")
        .eq("onboarding", true)
        .order("interest_da");

      if (error) {
        console.error("Error fetching interests:", error);
        return;
      }
      setAvailableInterests(data || []);
    };
    fetchInterests();
  }, []);

  const toggleInterest = (interestId: string) => {
    if (interests.includes(interestId)) {
      setInterests(interests.filter((i) => i !== interestId));
    } else {
      setInterests([...interests, interestId]);
    }
  };

  return (
    <SplitScreen>
      <div>
        <OnboardingStepper step={2} />
        <PageTitle>Hvad er dine interesser?</PageTitle>
        <p className="text-gray-600 mb-6">Vælg de ting du godt kan lide at lave</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {availableInterests.map((interest) => (
            <button
              key={interest.interest_id}
              onClick={() => toggleInterest(interest.interest_id)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                interests.includes(interest.interest_id)
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-300 hover:border-gray-500"
              }`}
            >
              {interest.interest_da}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant={"secondary"} onClick={() => navigate({ to: "/details" })}>
            Tilbage
          </Button>
          <Button disabled={interests.length === 0} onClick={() => navigate({ to: "/location" })} className="ml-auto">
            Videre
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </SplitScreen>
  );
}

function UnauthedPage() {
  return (
    <UnauthedRoute>
      <Interests />
    </UnauthedRoute>
  );
}

export const Route = createFileRoute("/interests")({
  component: UnauthedPage,
});

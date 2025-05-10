import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SplitScreen } from "../components/SplitScreen";
import { useOnboardingStore } from "../store/onboarding";
import { Button } from "@/components/ui/button";

const INTERESTS = [
  "Technology",
  "Travel",
  "Food",
  "Sports",
  "Music",
  "Art",
  "Reading",
  "Gaming",
  "Photography",
  "Nature",
];

export function Interests() {
  const navigate = useNavigate();
  const { interests, setInterests } = useOnboardingStore();

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
        <div className="grid grid-cols-2 gap-3 mb-6">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                interests.includes(interest)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 hover:border-blue-500"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant={"secondary"}
            onClick={() => navigate({ to: "/details" })}
          >
            Tilbage
          </Button>
          <Button
            type="submit"
            disabled={interests.length === 0}
            onClick={() => navigate({ to: "/location" })}
            className="ml-auto"
          >
            Videre
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </SplitScreen>
  );
}

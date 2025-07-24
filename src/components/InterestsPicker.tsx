import { Tables } from "database.types";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";

export interface InterestsPickerProps {
  selectedInterestsWithDescriptions: Record<string, string>;
  toggleInterest: (interestId: string) => void;
  removeInterest: (interestId: string) => void;
  updateInterestDescription: (interestId: string, description: string) => void;
}

export const InterestsPicker = ({
  selectedInterestsWithDescriptions,
  toggleInterest,
  removeInterest,
  updateInterestDescription,
}: InterestsPickerProps) => {
  const [availableInterests, setAvailableInterests] = useState<Tables<"interests">[]>([]);

  useEffect(() => {
    const fetchInterests = async () => {
      // Fetch available interests for selection
      const { data: interestsData, error: interestsError } = await supabase
        .from("interests")
        .select("*")
        .eq("onboarding", true)
        .order("interest_da");

      if (interestsError) throw interestsError;
      setAvailableInterests(interestsData || []);
    };
    fetchInterests();
  }, []);

  return (
    <>
      {/* Interest Selection Grid */}
      <div className="flex gap-3 mb-8">
        {availableInterests.map((interest) => (
          <button
            key={interest.interest_id}
            onClick={() => toggleInterest(interest.interest_id)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              interest.interest_id in selectedInterestsWithDescriptions
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 hover:border-blue-500"
            }`}
          >
            {interest.interest_da}
          </button>
        ))}
      </div>

      {/* Selected Interests with Descriptions */}
      {Object.keys(selectedInterestsWithDescriptions).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Valgte interesser</h3>
          <p className="text-gray-600 mb-4">Tilføj beskrivelser til dine interesser for at fortælle andre mere om dig</p>

          <div className="space-y-4">
            {Object.keys(selectedInterestsWithDescriptions).map((interestId) => {
              const interest = availableInterests.find((i) => i.interest_id === interestId);
              if (!interest) return null;

              return (
                <div key={interestId} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{interest.interest_da}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInterest(interestId)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Fjern
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beskriv hvor, hvordan og hvor ofte du udøver denne interesse...
                    </label>
                    <textarea
                      value={selectedInterestsWithDescriptions[interestId]}
                      onChange={(e) => updateInterestDescription(interestId, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 mt-1">{selectedInterestsWithDescriptions[interestId].length}/500 tegn</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

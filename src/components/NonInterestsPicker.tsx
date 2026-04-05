import { Tables } from "database.types";
import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { supabase } from "../lib/supabase";

export interface NonInterestsPickerProps {
  selectedNonInterests: Set<string>;
  toggleNonInterest: (interestId: string) => void;
  disabledInterestIds?: Set<string>;
}

export const NonInterestsPicker = ({
  selectedNonInterests,
  toggleNonInterest,
  disabledInterestIds = new Set(),
}: NonInterestsPickerProps) => {
  const [availableInterests, setAvailableInterests] = useState<Tables<"interests">[]>([]);

  useEffect(() => {
    const fetchInterests = async () => {
      const { data, error } = await supabase
        .from("interests")
        .select("*")
        .order("interest_da");

      if (error) throw error;
      setAvailableInterests(data || []);
    };
    fetchInterests();
  }, []);

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-6">
        {availableInterests.map((interest) => {
          const isSelected = selectedNonInterests.has(interest.interest_id);
          const isDisabled = disabledInterestIds.has(interest.interest_id);
          return (
            <button
              key={interest.interest_id}
              onClick={() => toggleNonInterest(interest.interest_id)}
              disabled={isDisabled}
              className={`p-3 rounded-lg border text-left transition-colors ${
                isSelected
                  ? "bg-red-50 text-red-700 border-red-300 ring-1 ring-red-200"
                  : isDisabled
                    ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                    : "border-gray-300 hover:border-red-400"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {isSelected && <Ban className="w-3.5 h-3.5" />}
                {interest.interest_da}
              </span>
            </button>
          );
        })}
      </div>

      {selectedNonInterests.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(selectedNonInterests).map((interestId) => {
            const interest = availableInterests.find((i) => i.interest_id === interestId);
            if (!interest) return null;
            return (
              <span
                key={interestId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-200"
              >
                <Ban className="w-3.5 h-3.5" />
                {interest.interest_da}
                <button
                  onClick={() => toggleNonInterest(interestId)}
                  className="ml-1 text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </>
  );
};

import { Tables } from "database.types";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { supabase } from "../lib/supabase";

export interface InterestsPickerProps {
  selectedInterestsWithDescriptions: Record<string, string>;
  toggleInterest: (interestId: string) => void;
  removeInterest: (interestId: string) => void;
  updateInterestDescription: (interestId: string, description: string) => void;
  disabledInterestIds?: Set<string>;
  onboardingOnly?: boolean;
}

export const InterestsPicker = ({
  selectedInterestsWithDescriptions,
  toggleInterest,
  removeInterest,
  updateInterestDescription,
  disabledInterestIds = new Set(),
  onboardingOnly = false,
}: InterestsPickerProps) => {
  const [availableInterests, setAvailableInterests] = useState<Tables<"interests">[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchInterests = async () => {
      let query = supabase
        .from("interests")
        .select("*");

      if (onboardingOnly) {
        query = query.eq("onboarding", true);
      }

      const { data: interestsData, error: interestsError } = await query.order("interest_da");

      if (interestsError) throw interestsError;
      setAvailableInterests(interestsData || []);
    };
    fetchInterests();
  }, [onboardingOnly]);

  const popularInterests = useMemo(
    () => availableInterests.filter((i) => i.onboarding),
    [availableInterests],
  );
  const otherInterests = useMemo(
    () => availableInterests.filter((i) => !i.onboarding),
    [availableInterests],
  );

  const groupByCategory = (interests: Tables<"interests">[]) => {
    const map = new Map<string, Tables<"interests">[]>();
    for (const interest of interests) {
      const cat = interest.category || "Andet";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(interest);
    }
    return map;
  };

  const popularGrouped = useMemo(() => groupByCategory(popularInterests), [popularInterests]);
  const otherGrouped = useMemo(() => groupByCategory(otherInterests), [otherInterests]);

  const selectedCount = Object.keys(selectedInterestsWithDescriptions).length;

  const renderGrid = (grouped: Map<string, Tables<"interests">[]>) =>
    Array.from(grouped.entries()).map(([category, interests]) => (
      <div key={category}>
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{category}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {interests.map((interest) => {
            const isSelected = interest.interest_id in selectedInterestsWithDescriptions;
            const isDisabled = disabledInterestIds.has(interest.interest_id);
            return (
              <button
                type="button"
                key={interest.interest_id}
                onClick={() => toggleInterest(interest.interest_id)}
                disabled={isDisabled}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-sm ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200 font-medium"
                    : isDisabled
                      ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                      : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/50"
                }`}
              >
                {interest.icon && <span className="text-lg shrink-0">{interest.icon}</span>}
                <span className="truncate">{interest.interest_da}</span>
              </button>
            );
          })}
        </div>
      </div>
    ));

  return (
    <>
      {/* Selection counter */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          {selectedCount === 0
            ? "Vælg dine interesser nedenfor"
            : `${selectedCount} interesse${selectedCount !== 1 ? "r" : ""} valgt`}
        </span>
        {selectedCount > 0 && (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-semibold">
            {selectedCount}
          </span>
        )}
      </div>

      {/* Popular interests (always visible) */}
      <div className="space-y-6 mb-6">
        {renderGrid(popularGrouped)}
      </div>

      {/* Other interests (collapsible) — only when not in onboardingOnly mode */}
      {!onboardingOnly && otherInterests.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 cursor-pointer"
          >
            {showAll ? (
              <>Skjul flere interesser <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Vis {otherInterests.length} flere interesser <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
          {showAll && (
            <div className="space-y-6 mb-8">
              {renderGrid(otherGrouped)}
            </div>
          )}
        </>
      )}

      {/* Selected Interests with Descriptions */}
      {selectedCount > 0 && (
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
                      {interest.icon && <span className="text-lg">{interest.icon}</span>}
                      <span className="font-medium">{interest.interest_da}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInterest(interestId)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Fjern
                    </Button>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Beskriv hvor, hvordan og hvor ofte du udøver denne interesse...
                    </label>
                    <Textarea
                      value={selectedInterestsWithDescriptions[interestId]}
                      onChange={(e) => updateInterestDescription(interestId, e.target.value)}
                      className="resize-none"
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

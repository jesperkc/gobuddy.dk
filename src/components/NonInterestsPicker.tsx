import { Tables } from "database.types";
import { useEffect, useMemo, useState } from "react";
import { Ban, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Toggle } from "./ui/toggle";

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
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchInterests = async () => {
      const { data, error } = await supabase.from("interests").select("*").order("interest_da");

      if (error) throw error;
      setAvailableInterests(data || []);
    };
    fetchInterests();
  }, []);

  const popularInterests = useMemo(() => availableInterests.filter((i) => i.onboarding), [availableInterests]);
  const otherInterests = useMemo(() => availableInterests.filter((i) => !i.onboarding), [availableInterests]);

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

  const renderGrid = (grouped: Map<string, Tables<"interests">[]>) =>
    Array.from(grouped.entries()).map(([category, interests]) => {
      const visible = interests.filter((i) => !disabledInterestIds.has(i.interest_id));
      if (visible.length === 0) return null;
      return (
        <div key={category}>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{category}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visible.map((interest) => {
              const isSelected = selectedNonInterests.has(interest.interest_id);
              return (
                <Toggle
                  key={interest.interest_id}
                  variant="red"
                  size={"lg"}
                  pressed={isSelected}
                  onPressedChange={() => toggleNonInterest(interest.interest_id)}
                  className="text-left text-sm justify-start"
                >
                  {isSelected && <Ban className="w-4 h-4 shrink-0" />}
                  {!interest.icon && isSelected && null}
                  <span className="truncate">{interest.interest_da}</span>
                </Toggle>
              );
            })}
          </div>
        </div>
      );
    });

  return (
    <>
      {/* Selection counter */}
      {selectedNonInterests.size > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
            {selectedNonInterests.size}
          </span>
          <span className="text-sm text-gray-500">
            {selectedNonInterests.size === 1 ? "ikke-interesse valgt" : "ikke-interesser valgt"}
          </span>
        </div>
      )}

      {/* Popular interests (always visible) */}
      <div className="space-y-6 mb-6">{renderGrid(popularGrouped)}</div>

      {/* Other interests (collapsible) */}
      {otherInterests.length > 0 && (
        <>
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 mb-6 cursor-pointer"
          >
            {showAll ? (
              <>
                Skjul flere ikke-interesser <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Vis {otherInterests.length} flere ikke-interesser <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
          {showAll && <div className="space-y-6 mb-6">{renderGrid(otherGrouped)}</div>}
        </>
      )}

      {/* Selected non-interests summary */}
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
                  aria-label={`Fjern ${interest.interest_da}`}
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

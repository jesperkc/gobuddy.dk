import { Ban } from "lucide-react";
import { InterestsPicker } from "@/components/InterestsPicker";
import { NonInterestsPicker } from "@/components/NonInterestsPicker";
import { SaveButton } from "./SaveButton";

interface InterestsTabPanelProps {
  selectedInterestsWithDescriptions: Record<string, string>;
  toggleInterest: (id: string) => void;
  removeInterest: (id: string) => void;
  updateInterestDescription: (id: string, desc: string) => void;
  onSave: () => void;
  saving: boolean;
  showNonInterests?: boolean;
  selectedNonInterests?: Set<string>;
  toggleNonInterest?: (id: string) => void;
}

export function InterestsTabPanel({
  selectedInterestsWithDescriptions,
  toggleInterest,
  removeInterest,
  updateInterestDescription,
  onSave,
  saving,
  showNonInterests = false,
  selectedNonInterests,
  toggleNonInterest,
}: InterestsTabPanelProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Interesser</h2>
      <p className="text-gray-600 mb-6">Vælg dine interesser</p>

      <InterestsPicker
        selectedInterestsWithDescriptions={selectedInterestsWithDescriptions}
        toggleInterest={toggleInterest}
        removeInterest={removeInterest}
        updateInterestDescription={updateInterestDescription}
        disabledInterestIds={showNonInterests ? selectedNonInterests : undefined}
      />

      {showNonInterests && selectedNonInterests && toggleNonInterest && (
        <div className="border-t border-gray-200 mt-8 pt-8">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Ban className="w-6 h-6 text-red-500" />
            Ikke-interesser
          </h2>
          <p className="text-gray-600 mb-6">
            Vælg de ting du <strong>ikke</strong> er interesseret i — det
            hjælper med at finde bedre matches
          </p>

          <NonInterestsPicker
            selectedNonInterests={selectedNonInterests}
            toggleNonInterest={toggleNonInterest}
            disabledInterestIds={
              new Set(Object.keys(selectedInterestsWithDescriptions))
            }
          />
        </div>
      )}

      <div className="mt-8">
        <SaveButton onClick={onSave} saving={saving} />
      </div>
    </div>
  );
}

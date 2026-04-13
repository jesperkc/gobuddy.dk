interface InterestOption {
  interest_id: string;
  interest_da: string;
  icon: string;
}

import { Toggle } from "./ui/toggle";

interface ActivityInterestsPickerProps {
  interests: InterestOption[];
  selectedIds: Record<string, boolean>;
  toggle: (interestId: string) => void;
}

export function ActivityInterestsPicker({ interests, selectedIds, toggle }: ActivityInterestsPickerProps) {
  if (!interests || interests.length === 0) {
    return <p className="text-sm text-gray-400">Du har ingen interesser endnu. Tilføj interesser på din profil først.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {interests.map((interest) => (
        <Toggle
          key={interest.interest_id}
          variant="blue"
          pressed={!!selectedIds[interest.interest_id]}
          onPressedChange={() => toggle(interest.interest_id)}
          className="rounded-full px-3 py-1.5 h-auto"
        >
          <span>{interest.icon}</span>
          {interest.interest_da}
        </Toggle>
      ))}
    </div>
  );
}

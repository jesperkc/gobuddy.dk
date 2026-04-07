interface InterestOption {
  interest_id: string;
  interest_da: string;
  icon: string;
}

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
        <button
          key={interest.interest_id}
          type="button"
          onClick={() => toggle(interest.interest_id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedIds[interest.interest_id] ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <span>{interest.icon}</span>
          {interest.interest_da}
        </button>
      ))}
    </div>
  );
}

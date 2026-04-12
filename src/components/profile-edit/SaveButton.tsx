import { Button } from "@/components/ui/button";

interface SaveButtonProps {
  saving: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  label?: string;
  savingLabel?: string;
}

export function SaveButton({
  saving,
  disabled,
  onClick,
  type = "button",
  label = "Gem ændringer",
  savingLabel = "Gemmer...",
}: SaveButtonProps) {
  return (
    <div className="flex justify-end">
      <Button type={type} onClick={onClick} disabled={saving || disabled}>
        {saving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            {savingLabel}
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import { useUserProfileStore } from "@/store/userProfile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const BIO_MAX_LENGTH = 500;

/** An AI-written suggestion to put in the textarea. A new `id` applies it again. */
export interface BioSuggestionInput {
  id: number;
  text: string;
  /** True when written by the AI; false for the plain starter text. */
  ai: boolean;
  /** Overwrite whatever has been typed (e.g. after "Nyt forslag"). Otherwise typed text wins. */
  force?: boolean;
}

interface BioFormProps {
  id: string;
  label: string;
  placeholder?: string;
  submitLabel?: string;
  /** The profile editor lets people clear their bio; the first-run prompt doesn't. */
  allowEmpty?: boolean;
  onSaved?: () => void;
  suggestion?: BioSuggestionInput | null;
  suggestionLoading?: boolean;
  /** Extra actions next to the save button (e.g. "Spring over"). */
  children?: React.ReactNode;
}

/** Textarea + save for the user's own bio. Shared by the home prompt and the profile editor. */
export function BioForm({ id, label, placeholder, submitLabel = "Gem", allowEmpty = false, onSaved, suggestion, suggestionLoading = false, children }: BioFormProps) {
  const { user } = useAuth();
  const { profile, setProfile } = useUserProfileStore();
  const [text, setText] = useState(profile?.bio ?? suggestion?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  // Text currently in the box that came straight from the AI (cleared once edited).
  const [aiText, setAiText] = useState<string | null>(null);

  useEffect(() => {
    if (!suggestion) return;
    if (suggestion.force || !touched) {
      setText(suggestion.text);
      setAiText(suggestion.ai ? suggestion.text : null);
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.id]);

  const trimmed = text.trim();
  const canSave = !saving && (allowEmpty || !!trimmed) && trimmed !== (profile?.bio ?? "").trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !canSave) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bio: trimmed || null })
      .eq("profile_id", user.id);
    setSaving(false);

    if (error) {
      console.error("Could not save bio:", error);
      toast.error("Kunne ikke gemme din tekst. Prøv igen.");
      return;
    }
    setProfile({ ...profile, bio: trimmed || null });
    track("bio_saved", { ai_suggestion: aiText !== null, ai_unedited: aiText !== null && aiText.trim() === trimmed });
    toast.success("Gemt");
    onSaved?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </Label>
      <Textarea
        id={id}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setTouched(true);
          setAiText((prev) => (prev !== null && prev === e.target.value ? prev : null));
        }}
        placeholder={placeholder}
        aria-busy={suggestionLoading}
        rows={4}
        maxLength={BIO_MAX_LENGTH}
        className="resize-none text-base"
      />
      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs text-gray-500">
        <p className="flex items-center gap-1.5 min-h-4">
          {suggestionLoading ? (
            <>
              <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse" aria-hidden="true" />
              Skriver et forslag til dig…
            </>
          ) : aiText !== null && text === aiText ? (
            <>
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Forslag skrevet af AI ud fra dine valg. Ret det, så det lyder som dig.
            </>
          ) : null}
        </p>
        <span className="tabular-nums shrink-0" aria-hidden="true">
          {text.length}/{BIO_MAX_LENGTH}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="dark" type="submit" size="lg" disabled={!canSave} className="w-full sm:w-auto px-6">
          {saving ? "Gemmer..." : submitLabel}
        </Button>
        {children}
      </div>
    </form>
  );
}

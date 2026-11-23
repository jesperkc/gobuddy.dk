import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { track } from "@/lib/track";
import { suggestBio } from "@/lib/suggestBio";
import { buildBioTemplate } from "@/lib/bioTemplate";
import { useUserProfileStore } from "@/store/userProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useFirstPostsStore } from "@/store/firstPosts";
import { BioForm, type BioSuggestionInput } from "@/components/BioForm";
import { Button } from "@/components/ui/button";

/** Pre-fill the box with an AI-written suggestion as soon as the prompt shows. */
const AUTO_SUGGEST = true;

/** The very first thing we ask a new user for: a few lines about themselves. */
export function BioPrompt() {
  const { user } = useAuth();
  const skipBio = useFirstPostsStore((s) => s.skipBio);
  const setBioSuggestion = useFirstPostsStore((s) => s.setBioSuggestion);
  const cached = useFirstPostsStore((s) => (s.userId === user?.id ? s.bioSuggestion : null));

  const profile = useUserProfileStore((s) => s.profile);

  // Start with real, editable text: the saved AI suggestion if we have one, otherwise a plain
  // starter built from the user's own interests and city. The AI suggestion replaces the starter
  // when it arrives, unless the user has already started typing.
  const [suggestion, setSuggestion] = useState<BioSuggestionInput | null>(() => {
    if (cached) return { id: 1, text: cached, ai: true };
    const starter = buildBioTemplate(
      (profile?.user_interests ?? []).filter((ui) => !ui.is_non_interest && ui.interests).map((ui) => ui.interests.interest_da),
    );
    return starter ? { id: 1, text: starter, ai: false } : null;
  });
  const [loading, setLoading] = useState(false);
  const requested = useRef(!!cached);

  const generate = useCallback(
    async (force: boolean) => {
      if (!user || loading) return;
      setLoading(true);
      const result = await suggestBio();
      setLoading(false);

      if ("bio" in result) {
        setBioSuggestion(user.id, result.bio);
        setSuggestion((prev) => ({ id: (prev?.id ?? 0) + 1, text: result.bio, ai: true, force }));
        track("bio_suggestion_shown", { regenerated: force });
      } else if (force) {
        toast.error(result.error === "rate_limited" ? "Du har brugt dagens forslag. Skriv selv, eller prøv i morgen." : "Kunne ikke lave et forslag lige nu.");
      }
    },
    [user, loading, setBioSuggestion],
  );

  // One automatic request per visit; failures are silent and leave an ordinary empty box.
  useEffect(() => {
    if (!AUTO_SUGGEST || requested.current || !user) return;
    requested.current = true;
    generate(false);
  }, [user, generate]);

  return (
    <section className="card-reveal rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight text-gray-900 text-balance">Fortæl lidt om dig selv</h2>
      <p className="text-sm text-gray-500 mt-1.5 mb-6">Et par linjer er nok. Det gør det nemmere for andre at sige hej.</p>
      <BioForm
        id="bio-prompt"
        label="Om dig"
        placeholder="Fx: Jeg løber om morgenen og leder efter nogen at tage på cykeltur med i weekenden."
        suggestion={suggestion}
        suggestionLoading={loading}
      >
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={loading}
          onClick={() => generate(true)}
          className="w-full sm:w-auto rounded-full"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          {suggestion?.ai ? "Nyt forslag" : "Foreslå en tekst"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => {
            if (user) skipBio(user.id);
            track("bio_skipped");
          }}
          className="w-full sm:w-auto rounded-full text-gray-600"
        >
          Spring over
        </Button>
      </BioForm>
    </section>
  );
}

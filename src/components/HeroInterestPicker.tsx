import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { seedOnboardingInterests } from "@/store/onboarding";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { InterestIcon } from "@/components/InterestIcon";

type QuickInterest = {
  interest_id: string;
  interest_da: string;
  icon: string;
};

const MAX_CHIPS = 10;

/**
 * Landing-page hero entry into signup: the visitor answers "what do you do?"
 * before anything else. Picks are carried into the onboarding store, so the
 * interests step opens with them already selected.
 */
export function HeroInterestPicker() {
  const navigate = useNavigate();
  const [interests, setInterests] = useState<QuickInterest[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("interests")
      .select("interest_id, interest_da, icon, user_interests (count)")
      .eq("onboarding", true)
      .eq("user_interests.is_non_interest", false)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.length) {
          setFailed(true);
          return;
        }
        // Most popular first, so the chips on offer are the ones most likely to find a match.
        const sorted = data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((row: any) => ({ ...row, count: row.user_interests?.[0]?.count ?? 0 }))
          .sort((a, b) => b.count - a.count || a.interest_da.localeCompare(b.interest_da, "da"))
          .slice(0, MAX_CHIPS);
        setInterests(sorted);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const start = () => {
    if (selected.length) seedOnboardingInterests(selected);
    navigate({ to: "/interests" });
  };

  const selectedNames = (interests ?? []).filter((i) => selected.includes(i.interest_id)).map((i) => i.interest_da.toLowerCase());
  const ctaLabel =
    selectedNames.length === 0
      ? "Kom i gang gratis"
      : selectedNames.length === 1
        ? `Find buddies til ${selectedNames[0]}`
        : `Find buddies til ${selectedNames.length} interesser`;

  return (
    <div className="max-w-2xl mx-auto text-center">
      {!failed && (
        <>
          <h2 id="hero-picker-label" className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5">
            Hvad dyrker du?
          </h2>
          <div role="group" aria-labelledby="hero-picker-label" className="flex flex-wrap justify-center gap-2 min-h-[5.5rem] sm:min-h-[5rem]">
            {interests === null
              ? Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} aria-hidden className="h-10 rounded-full bg-white/40 animate-pulse" style={{ width: `${88 + ((i * 29) % 50)}px` }} />
                ))
              : interests.map((interest) => (
                  <Toggle
                    key={interest.interest_id}
                    pressed={selected.includes(interest.interest_id)}
                    onPressedChange={() => toggle(interest.interest_id)}
                    className="h-10 rounded-full px-4 text-sm font-medium bg-white/75 text-gray-900 shadow-sm hover:bg-white hover:text-gray-900 motion-safe:transition-[background-color,color,transform] motion-safe:active:scale-95 data-[state=on]:bg-gray-900 data-[state=on]:text-white focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-green-500"
                  >
                    <InterestIcon icon={interest.icon} size={16} />
                    {interest.interest_da}
                  </Toggle>
                ))}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          onClick={start}
          size="lg"
          className="h-14 rounded-full px-8 text-base bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-green-900/20"
        >
          {ctaLabel}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <p className="text-sm text-green-950/80" aria-live="polite">
          {selected.length > 0 ? (
            "Du kan tilføje flere interesser i næste trin."
          ) : (
            <>
              Gratis og tager to minutter.{" "}
              <Link to="/interesser" className="underline underline-offset-4 decoration-green-950/40 hover:decoration-green-950">
                Se alle interesser
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

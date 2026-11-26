import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ArrowRight, X } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { supabase } from "../../../src/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InterestIcon } from "@/components/InterestIcon";
import { INTEREST_ICON_PATHS } from "@/components/interest-icons";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Interest {
  interest_id: string;
  slug: string;
  interest_da: string;
  interest_en: string;
  icon: string | null;
  onboarding: boolean;
  /** Only used to order the popular row; never shown (the user base is still small). */
  popularity: number;
}

const MAX_POPULAR = 10;

/** Lowercase and fold Danish letters so "lob" finds "Løb" and "aegt" finds "Fægtning". */
function fold(value: string) {
  return value
    .toLocaleLowerCase("da")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Interest icon, or a quiet dot when no icon has been drawn for it yet. */
function InterestGlyph({ interest, size, className }: { interest: Interest; size: number; className?: string }) {
  if (interest.icon && INTEREST_ICON_PATHS[interest.icon]) {
    return <InterestIcon icon={interest.icon} size={size} className={className} />;
  }
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <span className="block h-1.5 w-1.5 rounded-full bg-current opacity-40" />
    </span>
  );
}

function PopularTile({ interest, index }: { interest: Interest; index: number }) {
  return (
    <Link
      to="/interesser/$slug"
      params={{ slug: interest.slug }}
      className="group card-reveal flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:shadow-lg lg:min-h-36 lg:flex-col lg:items-stretch lg:justify-between lg:gap-6 lg:p-5"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800 transition-colors duration-200 group-hover:bg-gray-900 group-hover:text-white lg:size-14">
        <InterestGlyph interest={interest} size={30} className="size-6 lg:size-7.5" />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 lg:flex-none lg:items-end">
        <h3 className="text-base font-semibold leading-tight text-gray-900 lg:text-lg">{interest.interest_da}</h3>
        <ArrowRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-gray-300 lg:mb-1 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gray-900"
        />
      </div>
    </Link>
  );
}

function IndexRow({ interest, letter }: { interest: Interest; letter: string | null }) {
  return (
    <li className="break-inside-avoid">
      <Link
        to="/interesser/$slug"
        params={{ slug: interest.slug }}
        className="group grid min-h-11 grid-cols-[1.25rem_1fr_auto] items-center gap-x-3 rounded-xl px-2.5 py-2 text-sm text-gray-800 no-underline transition-colors hover:bg-gray-50 hover:text-gray-900 sm:grid-cols-[0.75rem_1.25rem_1fr_auto] sm:text-base"
      >
        <span aria-hidden className="hidden font-baloo text-sm font-semibold text-green-700 sm:block">
          {letter}
        </span>
        <InterestGlyph interest={interest} size={20} className="text-gray-600 transition-colors group-hover:text-green-700" />
        <span className="leading-snug">{interest.interest_da}</span>
        <ArrowRight aria-hidden className="h-3.5 w-3.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  );
}

function InteresserPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");

  const fetchInterests = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { data, error } = await supabase
        .from("interests")
        .select("interest_id, slug, interest_da, interest_en, icon, onboarding, user_interests (count)")
        .eq("custom", false)
        // Don't count people who marked this as something they don't want.
        .eq("user_interests.is_non_interest", false);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Interest[] = (data || []).map((row: any) => ({
        interest_id: row.interest_id,
        slug: row.slug,
        interest_da: row.interest_da,
        interest_en: row.interest_en,
        icon: row.icon,
        onboarding: !!row.onboarding,
        popularity: row.user_interests?.[0]?.count || 0,
      }));
      mapped.sort((a, b) => a.interest_da.localeCompare(b.interest_da, "da"));
      setInterests(mapped);
    } catch (err) {
      console.error("Error fetching interests:", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  // The same curated set as the landing-page picker, most picked first.
  const popular = useMemo(
    () =>
      interests
        .filter((i) => i.onboarding)
        .sort((a, b) => b.popularity - a.popularity || a.interest_da.localeCompare(b.interest_da, "da"))
        .slice(0, MAX_POPULAR),
    [interests],
  );

  const query = fold(search.trim());
  const filtered = query ? interests.filter((i) => fold(i.interest_da).includes(query) || fold(i.interest_en).includes(query)) : interests;

  const clearSearch = () => setSearch("");

  // Enter opens the first match, so a typed search is one keystroke from the interest page.
  const openFirstMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query && filtered[0]) navigate({ to: "/interesser/$slug", params: { slug: filtered[0].slug } });
  };

  return (
    <DefaultLayout>
      <div className="space-y-12 sm:space-y-14">
        {/* Hero: what this is, and the fastest way to your interest */}
        <header className="grid gap-6 pt-4 sm:pt-10 lg:grid-cols-[1fr_24rem] lg:items-end lg:gap-12">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 text-balance sm:text-5xl">Find din næste hobby-buddy</h1>
            <p className="mt-3 max-w-xl text-lg text-gray-600 text-pretty">
              Udforsk {interests.length > 0 ? `${interests.length} ` : ""}interesser og find mennesker i nærheden, der deler din passion.
            </p>
          </div>
          <form role="search" onSubmit={openFirstMatch} className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Søg i interesser"
              placeholder="Søg, fx løb eller padel"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && clearSearch()}
              className="h-12 rounded-full pl-11 pr-12 text-base shadow-sm md:text-base"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                aria-label="Ryd søgning"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <X />
              </Button>
            )}
          </form>
        </header>

        {loading && (
          <div aria-busy="true" aria-label="Henter interesser" className="space-y-12 sm:space-y-14">
            <div>
              <div className="mb-4 h-7 w-28 rounded-full bg-gray-200/70 animate-pulse" />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {Array.from({ length: MAX_POPULAR }).map((_, i) => (
                  <div key={i} className="h-[4.25rem] rounded-2xl bg-white/60 animate-pulse lg:h-36" />
                ))}
              </div>
            </div>
            <div className="h-96 rounded-2xl bg-white/60 animate-pulse" />
          </div>
        )}

        {!loading && failed && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900">Interesserne kunne ikke hentes</h2>
            <p className="mt-1 text-gray-600">Tjek din forbindelse, og prøv igen.</p>
            <Button variant="outline" onClick={fetchInterests} className="mt-4">
              Prøv igen
            </Button>
          </div>
        )}

        {!loading && !failed && (
          <>
            {!query && popular.length > 0 && (
              <section aria-labelledby="popular-heading">
                <SectionHeader id="popular-heading" title="Populære" />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  {popular.map((interest, i) => (
                    <PopularTile key={interest.interest_id} interest={interest} index={i} />
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="all-heading">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 id="all-heading" className="text-lg font-medium">
                  {query ? "Søgeresultater" : "Alle interesser"}
                </h2>
                <p aria-live="polite" className="text-sm tabular-nums text-gray-500">
                  {query ? `${filtered.length} af ${interests.length}` : `${interests.length} i alt`}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-2 sm:p-4">
                {filtered.length > 0 ? (
                  <ul className="columns-2 gap-x-2 md:columns-3 lg:columns-4 lg:gap-x-6">
                    {filtered.map((interest, i) => {
                      const letter = interest.interest_da.charAt(0).toLocaleUpperCase("da");
                      const prevLetter = i > 0 ? filtered[i - 1].interest_da.charAt(0).toLocaleUpperCase("da") : null;
                      return <IndexRow key={interest.interest_id} interest={interest} letter={letter !== prevLetter ? letter : null} />;
                    })}
                  </ul>
                ) : (
                  <div className="px-4 py-10 text-center">
                    <p className="text-gray-700">Ingen interesser matcher “{search.trim()}”.</p>
                    <Button variant="ghost" onClick={clearSearch} className="mt-2 text-gray-600">
                      Ryd søgning
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {!isAuthenticated && (
          <section className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Klar til at finde din buddy?</h2>
              <p className="mt-1 text-gray-600">Vælg dine interesser, så viser vi dig folk i nærheden.</p>
            </div>
            <Button asChild variant="dark" size="lg" className="h-12 shrink-0 px-6 text-base no-underline">
              <Link to="/interests">
                Opret gratis profil
                <ArrowRight />
              </Link>
            </Button>
          </section>
        )}
      </div>
    </DefaultLayout>
  );
}

export const Route = createFileRoute("/interesser/")({
  component: InteresserPage,
});

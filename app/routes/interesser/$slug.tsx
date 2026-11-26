import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { supabase } from "../../../src/lib/supabase";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import { InterestIcon } from "@/components/InterestIcon";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { seedOnboardingInterests } from "@/store/onboarding";

interface InterestDetail {
  interest_id: string;
  interest_da: string;
  icon: string;
}

interface BuddyPreview {
  profile_id: string;
  first_name: string | null;
  city: string | null;
  description: string | null;
}

interface RelatedInterest {
  slug: string;
  interest_da: string;
  icon: string | null;
  score: number;
}

const MAX_RELATED = 6;
const MIN_RELATED_SCORE = 0.5;

async function fetchBuddies(interestId: string): Promise<BuddyPreview[]> {
  // Every user with this interest, paging past PostgREST's per-request row cap.
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error } = await supabase
      .from("user_interests")
      .select("description, profiles (profile_id, first_name, city)")
      .eq("interest_id", interestId)
      .eq("is_non_interest", false)
      .order("profile_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(page || []));
    if (!page || page.length < PAGE_SIZE) break;
  }
  return (
    rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((ui: any) => ui.profiles)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((ui: any) => ({
        profile_id: ui.profiles.profile_id,
        first_name: ui.profiles.first_name,
        city: ui.profiles.city,
        description: ui.description?.trim() || null,
      }))
      // People who wrote something about the interest first: they make the better introduction.
      .sort((a, b) => Number(!!b.description) - Number(!!a.description))
  );
}

async function fetchRelated(interestId: string): Promise<RelatedInterest[]> {
  const fields = "slug, interest_da, icon, custom";
  const { data, error } = await supabase
    .from("interest_relations")
    .select(
      `score, interest_id_a, a:interests!interest_relations_interest_id_a_fkey(${fields}), b:interests!interest_relations_interest_id_b_fkey(${fields})`,
    )
    .or(`interest_id_a.eq.${interestId},interest_id_b.eq.${interestId}`)
    .gte("score", MIN_RELATED_SCORE)
    .order("score", { ascending: false })
    .limit(MAX_RELATED * 2);
  if (error) throw error;
  return (
    (data || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => ({ other: row.interest_id_a === interestId ? row.b : row.a, score: row.score }))
      .filter(({ other }) => other && !other.custom && other.slug)
      .slice(0, MAX_RELATED)
      .map(({ other, score }) => ({ slug: other.slug, interest_da: other.interest_da, icon: other.icon, score }))
  );
}

function BuddyPreviewCard({ buddy, index }: { buddy: BuddyPreview; index: number }) {
  const initials = buddy.first_name ? buddy.first_name.slice(0, 2).toUpperCase() : "?";
  return (
    <li className="card-reveal rounded-2xl border border-gray-100 bg-white p-5" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11">
          <AvatarFallback className="bg-blue-100 text-sm font-medium text-blue-700">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{buddy.first_name || "Anonym"}</p>
          {buddy.city && (
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{buddy.city}</span>
            </p>
          )}
        </div>
      </div>
      {buddy.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600 text-pretty">{buddy.description}</p>}
    </li>
  );
}

function InterestPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [interest, setInterest] = useState<InterestDetail | null>(null);
  const [buddies, setBuddies] = useState<BuddyPreview[]>([]);
  const [related, setRelated] = useState<RelatedInterest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setInterest(null);
      setBuddies([]);
      setRelated([]);
      try {
        const { data: interestData, error } = await supabase
          .from("interests")
          .select("interest_id, interest_da, icon")
          .eq("slug", slug)
          .maybeSingle();
        if (error) throw error;
        if (!interestData || cancelled) return;
        setInterest(interestData);

        const [buddyList, relatedList] = await Promise.all([
          fetchBuddies(interestData.interest_id),
          // Related interests are a nice-to-have; never let them break the page.
          fetchRelated(interestData.interest_id).catch((err) => {
            console.error("Error fetching related interests:", err);
            return [];
          }),
        ]);
        if (cancelled) return;
        setBuddies(buddyList);
        setRelated(relatedList);
      } catch (err) {
        console.error("Error fetching interest:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Carry this interest into signup so the interests step opens with it selected.
  const startSignup = () => {
    if (interest) seedOnboardingInterests([interest.interest_id]);
    navigate({ to: "/interests" });
  };

  const name = interest?.interest_da ?? "";
  const nameLower = name.toLocaleLowerCase("da");

  return (
    <DefaultLayout>
      <div className="space-y-12 sm:space-y-14">
        <div className="pt-4 sm:pt-10">
          <Link to="/interesser" className="inline-flex items-center gap-1.5 text-sm text-gray-500 no-underline hover:text-gray-900">
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Alle interesser
          </Link>

          {loading && (
            <div aria-busy="true" aria-label="Henter interesse" className="mt-6 flex items-center gap-5">
              <div className="size-16 shrink-0 rounded-full bg-white/70 animate-pulse sm:size-20" />
              <div className="h-12 w-56 rounded-full bg-white/70 animate-pulse" />
            </div>
          )}

          {!loading && interest && (
            <header className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800 sm:size-20">
                  <InterestIcon icon={interest.icon} size={40} className="size-8 sm:size-10" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 text-balance sm:text-5xl">{name}</h1>
                  <p className="mt-1 text-lg text-gray-600 text-pretty">Find folk i nærheden, der også dyrker {nameLower}.</p>
                </div>
              </div>

              {!isAuthenticated && (
                <div className="flex flex-col gap-2 lg:items-end">
                  <Button onClick={startSignup} variant="dark" size="lg" className="h-12 px-6 text-base">
                    Find buddies til {nameLower}
                    <ArrowRight />
                  </Button>
                  <p className="text-sm text-gray-500 sm:pl-6 lg:pl-0">Gratis. {name} er allerede valgt for dig.</p>
                </div>
              )}
            </header>
          )}
        </div>

        {!loading && interest && (
          <>
            {buddies.length > 0 ? (
              <section aria-labelledby="buddies-heading">
                <SectionHeader id="buddies-heading" title="Buddies med denne interesse" />
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {buddies.map((buddy, i) => (
                    <BuddyPreviewCard key={buddy.profile_id} buddy={buddy} index={i} />
                  ))}
                </ul>
              </section>
            ) : (
              <section className="rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center sm:py-12">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100 text-green-800">
                  <InterestIcon icon={interest.icon} size={28} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Ingen buddies med {nameLower} endnu</h2>
                {isAuthenticated ? (
                  <>
                    <p className="mx-auto mt-2 max-w-sm text-gray-600 text-pretty">
                      Tilføj {nameLower} på din profil, så er du den første, andre finder her.
                    </p>
                    <Button asChild variant="outline" className="mt-5 no-underline">
                      <Link to="/profile-edit">Redigér dine interesser</Link>
                    </Button>
                  </>
                ) : (
                  <p className="mx-auto mt-2 max-w-sm text-gray-600 text-pretty">
                    Opret en profil med {nameLower} som interesse, så er du den første, andre finder her.
                  </p>
                )}
              </section>
            )}

            {related.length > 0 && (
              <section aria-labelledby="related-heading">
                <SectionHeader id="related-heading" title="Relaterede interesser" />
                <ul className="flex flex-wrap gap-2">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link
                        to="/interesser/$slug"
                        params={{ slug: r.slug }}
                        className="group inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white pl-3 pr-4 text-sm font-medium text-gray-800 no-underline transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                      >
                        <InterestIcon icon={r.icon} size={18} className="text-green-700 transition-colors group-hover:text-white" />
                        {r.interest_da}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {!loading && !interest && (
          <section className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Interessen blev ikke fundet</h1>
            <p className="mx-auto mt-2 max-w-sm text-gray-600">Den er måske omdøbt eller fjernet. Find den i oversigten over alle interesser.</p>
            <Button asChild variant="dark" className="mt-5 no-underline">
              <Link to="/interesser">Se alle interesser</Link>
            </Button>
          </section>
        )}
      </div>
    </DefaultLayout>
  );
}

export const Route = createFileRoute("/interesser/$slug")({
  component: InterestPage,
});

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Users, MapPin } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { supabase } from "../../../src/lib/supabase";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import { InterestIcon } from "@/components/InterestIcon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { seedOnboardingInterests } from "@/store/onboarding";

interface InterestDetail {
  interest_id: string;
  interest_da: string;
  interest_en: string;
  icon: string;
  category: string;
}

interface BuddyPreview {
  profile_id: string;
  first_name: string | null;
  city: string | null;
  description: string | null;
}

function InterestPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [interest, setInterest] = useState<InterestDetail | null>(null);
  const [buddies, setBuddies] = useState<BuddyPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch interest details
        const { data: interestData, error: intError } = await supabase
          .from("interests")
          .select("interest_id, interest_da, interest_en, icon, category, slug")
          .eq("slug", slug)
          .single();

        if (intError) throw intError;
        setInterest(interestData);

        // Fetch every user with this interest, paging past PostgREST's per-request row cap.
        const PAGE_SIZE = 1000;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userInterests: any[] = [];
        for (let from = 0; ; from += PAGE_SIZE) {
          const { data: page, error: uiError } = await supabase
            .from("user_interests")
            .select(
              `
              description,
              profiles (
                profile_id,
                first_name,
                city
              )
            `,
            )
            .eq("interest_id", interestData.interest_id)
            .eq("is_non_interest", false)
            .order("profile_id")
            .range(from, from + PAGE_SIZE - 1);

          if (uiError) throw uiError;
          userInterests.push(...(page || []));
          if (!page || page.length < PAGE_SIZE) break;
        }

        const mapped: BuddyPreview[] = userInterests
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((ui: any) => ui.profiles)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((ui: any) => ({
            profile_id: ui.profiles.profile_id,
            first_name: ui.profiles.first_name,
            city: ui.profiles.city,
            description: ui.description,
          }));

        setBuddies(mapped);
      } catch (err) {
        console.error("Error fetching interest:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  // Carry this interest into signup so the interests step opens with it selected.
  const startSignup = () => {
    if (interest) seedOnboardingInterests([interest.interest_id]);
    navigate({ to: "/interests" });
  };

  return (
    <DefaultLayout
      header={
        <div>
          <Link to="/interesser" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Alle interesser
          </Link>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-48" />
              <div className="h-5 bg-gray-100 rounded w-72" />
            </div>
          ) : interest ? (
            <div>
              <div className="flex items-center gap-3">
                <InterestIcon icon={interest.icon} size={56} />
                <div>
                  <h1 className="text-4xl font-bold">{interest.interest_da}</h1>
                  <p className="text-gray-500 mt-1">{interest.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 text-gray-600">
                <Users className="w-5 h-5" />
                <span>
                  {buddies.length} {buddies.length === 1 ? "buddy" : "buddies"} er interesseret i {interest.interest_da.toLowerCase()}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {!loading && interest && (
          <>
            {/* Buddies list */}
            {buddies.length > 0 ? (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Buddies med denne interesse</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {buddies.map((buddy) => {
                    const initials = buddy.first_name ? buddy.first_name.slice(0, 2).toUpperCase() : "?";

                    return (
                      <div key={buddy.profile_id} className="flex items-center gap-3 rounded-xl border p-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{buddy.first_name || "Anonym"}</p>
                          {buddy.city && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {buddy.city}
                            </p>
                          )}
                          {buddy.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{buddy.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <InterestIcon icon={interest.icon} size={28} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Ingen buddies med {interest.interest_da.toLowerCase()} endnu</h2>
                <p className="mx-auto mt-2 max-w-sm text-gray-600">
                  Opret en profil med {interest.interest_da.toLowerCase()} som interesse, så er du den første, andre finder her.
                </p>
              </div>
            )}

            {/* CTA */}
            {!isAuthenticated && (
              <div className="text-center border-t pt-8">
                <p className="text-gray-600 mb-3">Interesseret i {interest.interest_da.toLowerCase()}?</p>
                <Button onClick={startSignup} size="lg" className="rounded-full h-12 px-6 text-base bg-blue-600 hover:bg-blue-800">
                  Opret gratis profil
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <p className="mt-3 text-sm text-gray-500">{interest.interest_da} er allerede valgt for dig.</p>
              </div>
            )}
          </>
        )}

        {!loading && !interest && (
          <div className="text-center py-12">
            <p className="text-gray-500">Denne interesse blev ikke fundet.</p>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

export const Route = createFileRoute("/interesser/$slug")({
  component: InterestPage,
});

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Users, MapPin } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { supabase } from "../../../src/lib/supabase";
import { Avatar, AvatarFallback } from "../../../src/components/ui/avatar";
import { InterestIcon } from "@/components/InterestIcon";

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

        // Fetch users with this interest
        const { data: userInterests, error: uiError } = await supabase
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
          .limit(50);

        if (uiError) throw uiError;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: BuddyPreview[] = (userInterests || [])
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

  return (
    <DefaultLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <Link to="/interesser" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
          Alle interesser
        </Link>

        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-48" />
            <div className="h-5 bg-gray-100 rounded w-72" />
            <div className="grid grid-cols-2 gap-3 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-100" />
              ))}
            </div>
          </div>
        )}

        {!loading && interest && (
          <>
            {/* Interest header */}
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
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-500 mb-2">Ingen buddies endnu med denne interesse.</p>
                <p className="text-gray-400 text-sm">Bliv den første!</p>
              </div>
            )}

            {/* CTA */}
            <div className="text-center border-t pt-8">
              <p className="text-gray-600 mb-3">Interesseret i {interest.interest_da.toLowerCase()}?</p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-800 transition-colors no-underline"
              >
                Opret gratis profil
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
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

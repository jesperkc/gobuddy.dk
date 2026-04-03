import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Users, ArrowRight } from "lucide-react";
import { DefaultLayout } from "../../../src/components/AppShell";
import { supabase } from "../../../src/lib/supabase";

interface InterestWithCount {
  interest_id: string;
  interest_da: string;
  interest_en: string;
  icon: string;
  category: string;
  user_count: number;
}

function InteresserPage() {
  const [interests, setInterests] = useState<InterestWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchInterests() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("interests")
          .select(`
            interest_id,
            interest_da,
            interest_en,
            icon,
            category,
            user_interests (count)
          `)
          .eq("custom", false)
          .order("category")
          .order("interest_da");

        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: InterestWithCount[] = (data || []).map((row: any) => ({
          interest_id: row.interest_id,
          interest_da: row.interest_da,
          interest_en: row.interest_en,
          icon: row.icon,
          category: row.category,
          user_count: row.user_interests?.[0]?.count || 0,
        }));

        setInterests(mapped);
      } catch (err) {
        console.error("Error fetching interests:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInterests();
  }, []);

  const filtered = search
    ? interests.filter(
        (i) =>
          i.interest_da.toLowerCase().includes(search.toLowerCase()) ||
          i.interest_en.toLowerCase().includes(search.toLowerCase())
      )
    : interests;

  // Group by category
  const grouped = filtered.reduce<Record<string, InterestWithCount[]>>((acc, interest) => {
    const cat = interest.category || "Andet";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(interest);
    return acc;
  }, {});

  const totalUsers = interests.reduce((sum, i) => sum + i.user_count, 0);

  return (
    <DefaultLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">Find din næste hobby-buddy</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Udforsk {interests.length} interesser og find mennesker i nærheden, der deler din passion.
            {totalUsers > 0 && ` ${totalUsers} buddies venter allerede.`}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søg i interesser..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && Object.keys(grouped).length === 0 && (
          <p className="text-center text-gray-500">Ingen interesser fundet for "{search}"</p>
        )}

        {!loading &&
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                {category}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((interest) => (
                  <Link
                    key={interest.interest_id}
                    to="/interesser/$interestId"
                    params={{ interestId: interest.interest_id }}
                    className="group rounded-xl border p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-colors no-underline text-inherit"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{interest.icon}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="font-medium mt-2">{interest.interest_da}</h3>
                    {interest.user_count > 0 && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {interest.user_count} {interest.user_count === 1 ? "buddy" : "buddies"}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}

        {/* CTA */}
        <div className="text-center border-t pt-8">
          <p className="text-gray-600 mb-3">Klar til at finde din buddy?</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors no-underline"
          >
            Opret gratis profil
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </DefaultLayout>
  );
}

export const Route = createFileRoute("/interesser/")({
  component: InteresserPage,
});

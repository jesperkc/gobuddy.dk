import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../src/components/AdminShell";
import { supabase } from "../../../../src/lib/supabase";
import { useClientEffect } from "../../../../src/lib/ssr-utils";
import { useState } from "react";
import type { Database } from "../../../../database.types";
import { Heart, Plus, Search, Star, Trash, TrendingUp } from "lucide-react";
import { AIIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";

type Interest = Database["public"]["Tables"]["interests"]["Row"];

interface InterestWithUsageCount extends Interest {
  usage_count: number;
}

const InterestManagement = () => {
  const [interests, setInterests] = useState<InterestWithUsageCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Load interests with usage count
  useClientEffect(() => {
    const loadInterests = async () => {
      try {
        setLoading(true);

        // Get interests with count of how many users have each interest
        const { data, error } = await supabase
          .from("interests")
          .select(
            `
            *,
            user_interests!inner (
              profile_id
            )
          `
          )
          .order("interest_da", { ascending: true });

        if (error) {
          console.error("Error loading interests:", error);
          return;
        }

        // Process data to count usage
        const processedData = (data || []).map((interest: Interest & { user_interests: { profile_id: string }[] }) => ({
          ...interest,
          usage_count: interest.user_interests?.length || 0,
        }));

        // Also get interests with no users
        const { data: allInterests, error: allError } = await supabase
          .from("interests")
          .select("*")
          .order("interest_da", { ascending: true });

        if (allError) {
          console.error("Error loading all interests:", allError);
          return;
        }

        // Merge with usage counts
        const interestsWithCounts = (allInterests || []).map((interest) => {
          const existing = processedData.find((p) => p.interest_id === interest.interest_id);
          return {
            ...interest,
            usage_count: existing?.usage_count || 0,
          };
        });

        setInterests(interestsWithCounts);
      } catch (error) {
        console.error("Error loading interests:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInterests();
  }, []);

  // Filter interests based on search term
  const filteredInterests = interests.filter((interest) => {
    return (
      !searchTerm ||
      interest.interest_da?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interest.interest_en?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleDeleteInterest = async (interestId: string, interestName: string) => {
    const confirmed = confirm(
      `Er du sikker på at du vil slette interesssen "${interestName}"? Dette vil også fjerne den fra alle brugere der har valgt den.`
    );

    if (!confirmed) return;

    try {
      // First delete all user_interests relationships
      const { error: userInterestsError } = await supabase.from("user_interests").delete().eq("interest_id", interestId);

      if (userInterestsError) throw userInterestsError;

      // Then delete the interest itself
      const { error: interestError } = await supabase.from("interests").delete().eq("interest_id", interestId);

      if (interestError) throw interestError;

      // Update local state
      setInterests(interests.filter((interest) => interest.interest_id !== interestId));
    } catch (error) {
      console.error("Error deleting interest:", error);
      alert("Der opstod en fejl ved sletning af interessen");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("da-DK");
  };

  const getUsageBadgeColor = (count: number) => {
    if (count === 0) return "bg-gray-100 text-gray-800";
    if (count < 5) return "bg-yellow-100 text-yellow-800";
    if (count < 20) return "bg-blue-100 text-blue-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <RoleProtectedRoute requiredRole="admin">
      <AdminShell title="Interesseadministration">
        <div className="space-y-6">
          {/* Search Controls */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <label htmlFor="search" className="sr-only">
                    Søg interesser
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="search"
                      name="search"
                      className="pl-10"
                      placeholder="Søg efter interesser (dansk eller engelsk)..."
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interest Statistics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Heart className="h-6 w-6 text-pink-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className=" font-medium text-gray-500 truncate">Totale Interesser</dt>
                      <dd className="text-lg font-medium text-gray-900">{loading ? "..." : interests.length.toLocaleString("da-DK")}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Star className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className=" font-medium text-gray-500 truncate">Populære (20+ brugere)</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? "..." : interests.filter((i) => i.usage_count >= 20).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className=" font-medium text-gray-500 truncate">Moderate (5-19 brugere)</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? "..." : interests.filter((i) => i.usage_count >= 5 && i.usage_count < 20).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Trash className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className=" font-medium text-gray-500 truncate">Ubrugte</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? "..." : interests.filter((i) => i.usage_count === 0).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interests Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Interesseliste ({filteredInterests.length})</h3>
                <div className="flex space-x-3">
                  <Link
                    to="/godaddy/interests/relations"
                    className="inline-flex items-center px-4 py-2 border border-transparent  font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Relationer
                  </Link>
                  <Link
                    to="/godaddy/interests/generate"
                    className="inline-flex items-center px-4 py-2 border border-transparent  font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <AIIcon className="w-4 h-4 mr-2" />
                    Generer interesser
                  </Link>
                  <Link
                    to="/godaddy/interests/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent  font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Opret ny interesse
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2  text-gray-500">Indlæser interesser...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interesse</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oversættelse</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oprettet</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brugt af</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handlinger</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInterests.map((interest) => (
                        <tr key={interest.interest_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                  <span className="text-white  font-medium">{(interest.interest_da || "?").charAt(0).toUpperCase()}</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className=" font-medium text-gray-900">{interest.interest_da || "Ikke angivet"}</div>
                                <div className="text-xs text-gray-400">ID: {interest.interest_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap  text-gray-500">{interest.interest_en || "Ikke oversat"}</td>
                          <td className="px-6 py-4 whitespace-nowrap  text-gray-500">{formatDate(interest.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUsageBadgeColor(
                                interest.usage_count
                              )}`}
                            >
                              {interest.usage_count} brugere
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap  font-medium space-x-2">
                            <button
                              onClick={() => handleDeleteInterest(interest.interest_id, interest.interest_da!)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                            >
                              Slet
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredInterests.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <p className="mt-2  text-gray-500">Ingen interesser fundet matchende søgekriterierne.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminShell>
    </RoleProtectedRoute>
  );
};

export const Route = createFileRoute("/godaddy/interests/")({
  component: InterestManagement,
});

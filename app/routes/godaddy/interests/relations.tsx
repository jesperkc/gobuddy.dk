import { createFileRoute } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../src/components/AdminShell";
import { supabase } from "../../../../src/lib/supabase";
import { useClientEffect } from "../../../../src/lib/ssr-utils";
import { useState } from "react";
import { Button } from "../../../../src/components/ui/button";
import { Trash, Link2 } from "lucide-react";
import { AIIcon } from "@/components/icons";
import { generateRelationsServerSide } from "../../api/generate-relations";
import { ErrorCard } from "@/components/form/ErrorCard";
import { SuccessCard } from "@/components/form/SuccessCard";

interface InterestRelationRow {
  interest_id_a: string;
  interest_id_b: string;
  score: number;
  created_at: string;
  interest_a_name: string;
  interest_b_name: string;
}

const InterestRelations = () => {
  const [relations, setRelations] = useState<InterestRelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRelations = async () => {
    try {
      setLoading(true);

      // Fetch relations with joined interest names
      const { data, error: fetchError } = await supabase
        .from("interest_relations")
        .select(
          `
          interest_id_a,
          interest_id_b,
          score,
          created_at,
          interest_a:interests!interest_relations_interest_id_a_fkey(interest_da),
          interest_b:interests!interest_relations_interest_id_b_fkey(interest_da)
        `
        )
        .order("score", { ascending: false });

      if (fetchError) {
        console.error("Error loading relations:", fetchError);
        setError(`Kunne ikke hente relationer: ${fetchError.message}`);
        return;
      }

      const mapped: InterestRelationRow[] = (data || []).map((row: Record<string, unknown>) => ({
        interest_id_a: row.interest_id_a as string,
        interest_id_b: row.interest_id_b as string,
        score: row.score as number,
        created_at: row.created_at as string,
        interest_a_name:
          (row.interest_a as { interest_da: string } | null)?.interest_da ?? "Ukendt",
        interest_b_name:
          (row.interest_b as { interest_da: string } | null)?.interest_da ?? "Ukendt",
      }));

      setRelations(mapped);
    } catch (err) {
      console.error("Error loading relations:", err);
    } finally {
      setLoading(false);
    }
  };

  useClientEffect(() => {
    loadRelations();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await generateRelationsServerSide();

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Genererede ${result.count} interesse-relationer med AI.`);
      }

      await loadRelations();
    } catch (err: unknown) {
      console.error("Error generating relations:", err);
      const msg = err instanceof Error ? err.message : "Der opstod en uventet fejl";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (idA: string, idB: string) => {
    const confirmed = confirm("Er du sikker på at du vil slette denne relation?");
    if (!confirmed) return;

    try {
      const { error: deleteError } = await supabase
        .from("interest_relations")
        .delete()
        .eq("interest_id_a", idA)
        .eq("interest_id_b", idB);

      if (deleteError) {
        setError(`Kunne ikke slette relation: ${deleteError.message}`);
        return;
      }

      setRelations((prev) =>
        prev.filter((r) => !(r.interest_id_a === idA && r.interest_id_b === idB))
      );
    } catch (err) {
      console.error("Error deleting relation:", err);
    }
  };

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.7) return "bg-green-100 text-green-800";
    if (score >= 0.5) return "bg-blue-100 text-blue-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <AdminShell title="Interesse-relationer" parentTo="/godaddy/interests">
      <div className="space-y-6">
        {error && <ErrorCard text={error} />}
        {success && <SuccessCard title="Succes!" text={success} />}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Link2 className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="font-medium text-gray-500 truncate">Totale relationer</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? "..." : relations.length}
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
                  <Link2 className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="font-medium text-gray-500 truncate">Stærke (≥70%)</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? "..." : relations.filter((r) => r.score >= 0.7).length}
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
                  <Link2 className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="font-medium text-gray-500 truncate">Svage (30-49%)</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? "..." : relations.filter((r) => r.score < 0.5).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Relations Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Relationsliste ({relations.length})
              </h3>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Genererer...
                  </>
                ) : (
                  <>
                    <AIIcon className="w-4 h-4 mr-2" />
                    Generer med AI
                  </>
                )}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Indlæser relationer...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interesse A
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interesse B
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Handlinger
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {relations.map((rel) => (
                      <tr
                        key={`${rel.interest_id_a}-${rel.interest_id_b}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{rel.interest_a_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{rel.interest_b_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBadgeColor(rel.score)}`}
                          >
                            {formatScore(rel.score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(rel.interest_id_a, rel.interest_id_b)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            <Trash className="h-3 w-3 mr-1" />
                            Slet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {relations.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Link2 className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="mt-2 text-gray-500">
                      Ingen relationer fundet. Klik &quot;Generer med AI&quot; for at oprette dem.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export const Route = createFileRoute("/godaddy/interests/relations")({
  component: () => (
    <RoleProtectedRoute requiredRole="admin">
      <InterestRelations />
    </RoleProtectedRoute>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../src/components/AdminShell";
import { supabase } from "../../../../src/lib/supabase";
import { useClientEffect } from "../../../../src/lib/ssr-utils";
import { useMemo, useState } from "react";
import { Button } from "../../../../src/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash, Link2, Check, Plus, Search } from "lucide-react";
import { AIIcon } from "@/components/icons";
import { generateRelationsServerSide } from "../../api/generate-relations";
import { ErrorCard } from "@/components/form/ErrorCard";
import { SuccessCard } from "@/components/form/SuccessCard";
import { SCORE_MEDIUM, SCORE_STRONG, getScoreBucket, SCORE_BADGE_CLASSES } from "@/lib/interestRelations";

interface InterestOpt {
  interest_id: string;
  interest_da: string;
}

interface RelationRow {
  interest_id_a: string;
  interest_id_b: string;
  score: number;
  interest_a_name: string;
  interest_b_name: string;
}

/** Ensure (a,b) is in the canonical order required by the DB check constraint. */
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

const InterestRelations = () => {
  const [interests, setInterests] = useState<InterestOpt[]>([]);
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Edit-in-place state: keyed by "a-b".
  const [editScores, setEditScores] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Create-form state
  const [newA, setNewA] = useState<string>("");
  const [newB, setNewB] = useState<string>("");
  const [newScore, setNewScore] = useState<string>("50");
  const [creating, setCreating] = useState(false);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    interests.forEach((i) => m.set(i.interest_id, i.interest_da));
    return m;
  }, [interests]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [{ data: ints, error: intErr }, { data: rels, error: relErr }] = await Promise.all([
        supabase.from("interests").select("interest_id, interest_da").order("interest_da"),
        supabase
          .from("interest_relations")
          .select(
            `
            interest_id_a,
            interest_id_b,
            score,
            interest_a:interests!interest_relations_interest_id_a_fkey(interest_da),
            interest_b:interests!interest_relations_interest_id_b_fkey(interest_da)
          `,
          )
          .order("score", { ascending: false }),
      ]);

      if (intErr) throw intErr;
      if (relErr) throw relErr;

      setInterests((ints ?? []) as InterestOpt[]);
      setRelations(
        ((rels ?? []) as unknown as Array<{
          interest_id_a: string;
          interest_id_b: string;
          score: number;
          interest_a: { interest_da: string } | null;
          interest_b: { interest_da: string } | null;
        }>).map((r) => ({
          interest_id_a: r.interest_id_a,
          interest_id_b: r.interest_id_b,
          score: r.score,
          interest_a_name: r.interest_a?.interest_da ?? "Ukendt",
          interest_b_name: r.interest_b?.interest_da ?? "Ukendt",
        })),
      );
    } catch (err) {
      console.error("Error loading relations:", err);
      setError(err instanceof Error ? err.message : "Kunne ikke hente relationer");
    } finally {
      setLoading(false);
    }
  };

  useClientEffect(() => {
    loadAll();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await generateRelationsServerSide();
      if (result.error) setError(result.error);
      else setSuccess(`Genererede ${result.count} interesse-relationer med AI.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der opstod en uventet fejl");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (idA: string, idB: string) => {
    if (!confirm("Er du sikker på at du vil slette denne relation?")) return;
    try {
      const { error: delErr } = await supabase
        .from("interest_relations")
        .delete()
        .eq("interest_id_a", idA)
        .eq("interest_id_b", idB);
      if (delErr) {
        setError(`Kunne ikke slette relation: ${delErr.message}`);
        return;
      }
      setRelations((prev) => prev.filter((r) => !(r.interest_id_a === idA && r.interest_id_b === idB)));
    } catch (err) {
      console.error("Error deleting relation:", err);
    }
  };

  const saveScore = async (rel: RelationRow) => {
    const key = `${rel.interest_id_a}-${rel.interest_id_b}`;
    const raw = editScores[key];
    if (raw === undefined) return;
    const pct = parseFloat(raw);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError("Score skal være mellem 0 og 100.");
      return;
    }
    const score = Math.round(pct) / 100;
    if (Math.abs(score - rel.score) < 1e-6) {
      setEditScores((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
      return;
    }

    setSavingKey(key);
    setError(null);
    try {
      const { error: upErr } = await supabase
        .from("interest_relations")
        .update({ score, source: "manual" })
        .eq("interest_id_a", rel.interest_id_a)
        .eq("interest_id_b", rel.interest_id_b);
      if (upErr) throw upErr;
      setRelations((prev) =>
        prev
          .map((r) =>
            r.interest_id_a === rel.interest_id_a && r.interest_id_b === rel.interest_id_b ? { ...r, score } : r,
          )
          .sort((a, b) => b.score - a.score),
      );
      setEditScores((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke opdatere score");
    } finally {
      setSavingKey(null);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setSuccess(null);
    if (!newA || !newB) {
      setError("Vælg to interesser.");
      return;
    }
    if (newA === newB) {
      setError("Vælg to forskellige interesser.");
      return;
    }
    const pct = parseFloat(newScore);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError("Score skal være mellem 0 og 100.");
      return;
    }
    const score = Math.round(pct) / 100;
    const [idA, idB] = orderPair(newA, newB);

    setCreating(true);
    try {
      const { error: upErr } = await supabase
        .from("interest_relations")
        .upsert(
          { interest_id_a: idA, interest_id_b: idB, score, source: "manual" },
          { onConflict: "interest_id_a,interest_id_b" },
        );
      if (upErr) throw upErr;
      setSuccess("Relation gemt.");
      setNewA("");
      setNewB("");
      setNewScore("50");
      // Merge in-place: replace if exists, else prepend.
      setRelations((prev) => {
        const idx = prev.findIndex((r) => r.interest_id_a === idA && r.interest_id_b === idB);
        const row: RelationRow = {
          interest_id_a: idA,
          interest_id_b: idB,
          score,
          interest_a_name: nameById.get(idA) ?? "Ukendt",
          interest_b_name: nameById.get(idB) ?? "Ukendt",
        };
        const next = idx >= 0 ? prev.map((r, i) => (i === idx ? row : r)) : [row, ...prev];
        return next.sort((a, b) => b.score - a.score);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette relation");
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return relations;
    return relations.filter(
      (r) => r.interest_a_name.toLowerCase().includes(q) || r.interest_b_name.toLowerCase().includes(q),
    );
  }, [relations, query]);

  const getScoreBadgeColor = (score: number) => SCORE_BADGE_CLASSES[getScoreBucket(score)];

  return (
    <AdminShell title="Interesse-relationer" crumbs={[{ label: "Interesser", href: "/godaddy/interests" }, { label: "Relationer" }]}>
      <div className="space-y-6">
        {error && <ErrorCard text={error} />}
        {success && <SuccessCard title="Succes!" text={success} />}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard label="Totale relationer" value={loading ? "..." : relations.length} color="text-blue-400" />
          <StatCard
            label={`Stærke (≥${Math.round(SCORE_STRONG * 100)}%)`}
            value={loading ? "..." : relations.filter((r) => r.score >= SCORE_STRONG).length}
            color="text-green-400"
          />
          <StatCard
            label={`Svage (<${Math.round(SCORE_MEDIUM * 100)}%)`}
            value={loading ? "..." : relations.filter((r) => r.score < SCORE_MEDIUM).length}
            color="text-yellow-400"
          />
        </div>

        {/* Create form */}
        <div className="bg-white shadow rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Opret / opdater relation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end">
            <LabeledSelect
              label="Interesse A"
              value={newA}
              onChange={setNewA}
              options={interests.filter((i) => i.interest_id !== newB)}
            />
            <LabeledSelect
              label="Interesse B"
              value={newB}
              onChange={setNewB}
              options={interests.filter((i) => i.interest_id !== newA)}
            />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Score (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newA || !newB} className="h-10">
              {creating ? "Gemmer…" : "Gem"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Findes parret allerede, bliver scoren opdateret.
          </p>
        </div>

        {/* Relations table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Relationsliste ({filtered.length}
                {filtered.length !== relations.length ? ` af ${relations.length}` : ""})
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    placeholder="Søg..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-8 w-56"
                  />
                </div>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Genererer…
                    </>
                  ) : (
                    <>
                      <AIIcon className="w-4 h-4 mr-2" />
                      Generer med AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-2 text-gray-500">Indlæser relationer...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Interesse A</Th>
                      <Th>Interesse B</Th>
                      <Th>Score</Th>
                      <Th className="w-32">Rediger</Th>
                      <Th className="w-24">Handling</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((rel) => {
                      const key = `${rel.interest_id_a}-${rel.interest_id_b}`;
                      const editing = editScores[key] !== undefined;
                      const editValue = editScores[key] ?? Math.round(rel.score * 100).toString();
                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-6 py-3 whitespace-nowrap text-gray-900">{rel.interest_a_name}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-gray-900">{rel.interest_b_name}</td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${getScoreBadgeColor(rel.score)}`}
                            >
                              {Math.round(rel.score * 100)}%
                            </span>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={editValue}
                                onChange={(e) =>
                                  setEditScores((s) => ({ ...s, [key]: e.target.value }))
                                }
                                onBlur={() => editing && saveScore(rel)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="h-8 w-20 tabular-nums"
                              />
                              {savingKey === key ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600" />
                              ) : editing ? (
                                <button
                                  onClick={() => saveScore(rel)}
                                  className="text-blue-700 hover:text-blue-800"
                                  title="Gem"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleDelete(rel.interest_id_a, rel.interest_id_b)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                            >
                              <Trash className="h-3 w-3 mr-1" />
                              Slet
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filtered.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Link2 className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="mt-2 text-gray-500">
                      {relations.length === 0
                        ? 'Ingen relationer fundet. Brug formularen ovenfor eller klik "Generer med AI".'
                        : "Ingen relationer matchede søgningen."}
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

/* ————————————————————————————————————————————————— */

function StatCard({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5 flex items-center">
        <Link2 className={`h-6 w-6 ${color}`} />
        <div className="ml-5 w-0 flex-1">
          <dt className="font-medium text-gray-500 truncate">{label}</dt>
          <dd className="text-lg font-medium text-gray-900 tabular-nums">{value}</dd>
        </div>
      </div>
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: InterestOpt[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Vælg interesse" />
        </SelectTrigger>
        <SelectContent>
          {options.map((i) => (
            <SelectItem key={i.interest_id} value={i.interest_id}>
              {i.interest_da}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

export const Route = createFileRoute("/godaddy/interests/relations")({
  component: () => (
    <RoleProtectedRoute requiredRole="admin">
      <InterestRelations />
    </RoleProtectedRoute>
  ),
});

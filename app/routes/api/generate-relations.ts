import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../../../src/lib/supabase";

interface RelationPair {
  a: string;
  b: string;
  score: number;
}

export async function generateRelationsForInterest(newInterestId: string): Promise<{ count: number; error?: string }> {
  try {
    const claudeKey = import.meta.env.VITE_CLAUDE_KEY ?? import.meta.env.CLAUDE_KEY;
    if (!claudeKey) {
      return { count: 0, error: "Claude API nøgle mangler." };
    }

    // Fetch the new interest + all other interests
    const { data: interests, error: fetchError } = await supabase
      .from("interests")
      .select("interest_id, interest_da, category")
      .order("interest_da", { ascending: true });

    if (fetchError || !interests) {
      return { count: 0, error: `Kunne ikke hente interesser: ${fetchError?.message}` };
    }

    const newInterest = interests.find((i) => i.interest_id === newInterestId);
    if (!newInterest) return { count: 0, error: "Ny interesse ikke fundet." };

    const others = interests.filter((i) => i.interest_id !== newInterestId);
    if (others.length === 0) return { count: 0 };

    const othersList = others
      .map((i) => `${i.interest_id} | ${i.interest_da} | ${i.category ?? ""}`)
      .join("\n");

    const prompt = `Du er en ekspert i at analysere relationer mellem hobbyer og interesser.

En NY interesse er lige blevet oprettet:
ID: ${newInterest.interest_id}
Navn: ${newInterest.interest_da}
Kategori: ${newInterest.category ?? ""}

Her er alle eksisterende interesser:
${othersList}

Find hvilke eksisterende interesser der er relaterede til den nye interesse. Tildel en score fra 0.0 til 1.0:
- 1.0 = næsten identiske
- 0.7-0.9 = stærkt relaterede
- 0.5-0.7 = moderat relaterede
- 0.3-0.5 = svagt relaterede

Returner KUN par med score >= 0.3.

Returner et JSON-objekt:
{"pairs": [{"other_id": "uuid-af-eksisterende-interesse", "score": 0.75}]}

VIGTIGT: Brug de præcise UUID'er. Returner KUN valid JSON, ingen anden tekst.`;

    const client = new Anthropic({ apiKey: claudeKey, dangerouslyAllowBrowser: true });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return { count: 0 };

    let jsonText = textBlock.text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    const parsed: { pairs: { other_id: string; score: number }[] } = JSON.parse(jsonText);
    if (!parsed.pairs?.length) return { count: 0 };

    const validIds = new Set(others.map((i) => i.interest_id));
    const rows = parsed.pairs
      .filter((p) => validIds.has(p.other_id) && p.score >= 0.3 && p.score <= 1)
      .map((p) => {
        const [a, b] = newInterestId < p.other_id
          ? [newInterestId, p.other_id]
          : [p.other_id, newInterestId];
        return { interest_id_a: a, interest_id_b: b, score: Math.round(p.score * 100) / 100 };
      });

    if (rows.length === 0) return { count: 0 };

    const { error: upsertError } = await supabase
      .from("interest_relations")
      .upsert(rows, { onConflict: "interest_id_a,interest_id_b" });

    if (upsertError) return { count: 0, error: upsertError.message };
    return { count: rows.length };
  } catch (error: unknown) {
    console.error("Error generating relations for interest:", error);
    return { count: 0, error: error instanceof Error ? error.message : "Ukendt fejl" };
  }
}

export async function generateRelationsServerSide(): Promise<{ count: number; error?: string }> {
  try {
    const claudeKey = import.meta.env.VITE_CLAUDE_KEY ?? import.meta.env.CLAUDE_KEY;

    if (!claudeKey) {
      return { count: 0, error: "Claude API nøgle er ikke konfigureret. Check .env filen (CLAUDE_KEY)." };
    }

    // Fetch all interests
    const { data: interests, error: fetchError } = await supabase
      .from("interests")
      .select("interest_id, interest_da, category")
      .order("interest_da", { ascending: true });

    if (fetchError) {
      return { count: 0, error: `Kunne ikke hente interesser: ${fetchError.message}` };
    }

    if (!interests || interests.length < 2) {
      return { count: 0, error: "Der skal være mindst 2 interesser for at generere relationer." };
    }

    // Build a compact list for the prompt
    const interestList = interests
      .map((i) => `${i.interest_id} | ${i.interest_da} | ${i.category ?? ""}`)
      .join("\n");

    const prompt = `Du er en ekspert i at analysere relationer mellem hobbyer og interesser.

Nedenfor er en liste af interesser med deres ID, danske navn og kategori:

${interestList}

Analyser disse interesser og find ALLE par der er relaterede. Tildel en score fra 0.0 til 1.0 der angiver hvor stærkt relaterede de er:
- 1.0 = næsten identiske (f.eks. "løb" og "jogging")
- 0.7-0.9 = stærkt relaterede (f.eks. "fodbold" og "håndbold")
- 0.5-0.7 = moderat relaterede (f.eks. "madlavning" og "bagning")
- 0.3-0.5 = svagt relaterede (f.eks. "yoga" og "meditation")

Returner KUN par med score >= 0.3.

Returner et JSON-objekt med nøjagtigt dette format:
{"pairs": [{"a": "uuid-af-interesse-a", "b": "uuid-af-interesse-b", "score": 0.75}]}

VIGTIGT:
- Brug de præcise UUID'er fra listen ovenfor
- For hvert par skal "a" være det UUID der kommer FØRST alfabetisk (a < b som streng-sammenligning)
- Returner KUN valid JSON, ingen anden tekst`;

    const client = new Anthropic({
      apiKey: claudeKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { count: 0, error: "Ingen tekst modtaget fra Claude." };
    }

    const rawText = textBlock.text.trim();

    // Extract JSON from possible markdown code block
    let jsonText = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    let parsed: { pairs: RelationPair[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return { count: 0, error: "Kunne ikke parse Claude response som JSON." };
    }

    if (!parsed.pairs || !Array.isArray(parsed.pairs)) {
      return { count: 0, error: "Ugyldigt response format fra Claude (mangler 'pairs' array)." };
    }

    // Build a set of valid interest IDs for validation
    const validIds = new Set(interests.map((i) => i.interest_id));

    // Filter and normalize pairs
    const validPairs = parsed.pairs.filter((pair) => {
      if (!validIds.has(pair.a) || !validIds.has(pair.b)) return false;
      if (pair.a === pair.b) return false;
      if (typeof pair.score !== "number" || pair.score < 0.3 || pair.score > 1) return false;
      return true;
    });

    // Ensure a < b constraint
    const normalizedPairs = validPairs.map((pair) => {
      const [first, second] = pair.a < pair.b ? [pair.a, pair.b] : [pair.b, pair.a];
      return { a: first, b: second, score: Math.round(pair.score * 100) / 100 };
    });

    // Deduplicate (in case Claude returned the same pair twice)
    const seen = new Set<string>();
    const dedupedPairs = normalizedPairs.filter((pair) => {
      const key = `${pair.a}:${pair.b}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (dedupedPairs.length === 0) {
      return { count: 0, error: "Ingen gyldige relationer blev genereret." };
    }

    // Upsert in batches of 50
    const batchSize = 50;
    let totalUpserted = 0;

    for (let i = 0; i < dedupedPairs.length; i += batchSize) {
      const batch = dedupedPairs.slice(i, i + batchSize).map((pair) => ({
        interest_id_a: pair.a,
        interest_id_b: pair.b,
        score: pair.score,
      }));

      const { error: upsertError } = await supabase
        .from("interest_relations")
        .upsert(batch, { onConflict: "interest_id_a,interest_id_b" });

      if (upsertError) {
        console.error("Upsert batch error:", upsertError);
        return {
          count: totalUpserted,
          error: `Fejl ved indsættelse af batch ${Math.floor(i / batchSize) + 1}: ${upsertError.message}`,
        };
      }

      totalUpserted += batch.length;
    }

    return { count: totalUpserted };
  } catch (error: unknown) {
    console.error("Error generating relations:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Der opstod en fejl ved generering af relationer";
    return { count: 0, error: errorMessage };
  }
}

// Placeholder route component
const APIRoute = () => {
  return null;
};

export const Route = createFileRoute("/api/generate-relations")({
  component: APIRoute,
});

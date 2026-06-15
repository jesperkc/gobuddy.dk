// Generate AI similarity scores between interests using Claude.
// Replaces the previous browser-side call which exposed the Claude API key.
//
// Modes:
//   POST { mode: "all" }                 → Generate relations for every interest
//                                           that has no relations yet.
//   POST { mode: "one", interestId }     → Generate relations for a single
//                                           interest (e.g. just-created one).
//
// Behaviour:
//   - Never overwrites rows with source = 'manual'.
//   - Uses upsert with ignoreDuplicates so manual rows are preserved even
//     when the AI scores a pair that an admin has already touched.
//   - All Claude calls happen per-anchor → each prompt stays small enough
//     to fit comfortably in max_tokens.
//
// Auth: requires the caller's JWT to belong to a user with role 'admin'.
//
// Deploy: supabase functions deploy generate-relations

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ── Env (read lazily so missing secrets yield a clear 500, not a boot failure) ─

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const SCORE_MIN = 0.3;
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Types ───────────────────────────────────────────────────────────

interface Interest {
  interest_id: string;
  interest_da: string;
  category: string | null;
}

interface AIPair {
  other_id: string;
  score: number;
}

interface ExistingRow {
  interest_id_a: string;
  interest_id_b: string;
}

// ── Auth ────────────────────────────────────────────────────────────

async function requireAdmin(
  req: Request,
): Promise<{ ok: true; admin: SupabaseClient } | { ok: false; res: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, res: json(401, { error: "Missing Authorization header" }) };
  }
  const userClient = createClient(env("SUPABASE_URL"), env("SB_PUBLISHABLE_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, res: json(401, { error: "Invalid token" }) };
  }
  const { data: roles, error: rolesErr } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  if (rolesErr) return { ok: false, res: json(500, { error: rolesErr.message }) };
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  if (!isAdmin) return { ok: false, res: json(403, { error: "Admin role required" }) };

  // Use service role for the actual writes so RLS doesn't get in the way.
  const admin = createClient(env("SUPABASE_URL"), env("SB_SECRET_KEY"));
  return { ok: true, admin };
}

// ── Claude ──────────────────────────────────────────────────────────

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

function buildPrompt(anchor: Interest, others: Interest[]): string {
  const list = others
    .map((i) => `${i.interest_id} | ${i.interest_da} | ${i.category ?? ""}`)
    .join("\n");

  return `Du er en ekspert i at analysere relationer mellem hobbyer og interesser.

ANKER-interesse:
ID: ${anchor.interest_id}
Navn: ${anchor.interest_da}
Kategori: ${anchor.category ?? ""}

Eksisterende interesser (kandidater):
${list}

Find hvilke kandidat-interesser der er relaterede til anker-interessen. Tildel en score fra 0.0 til 1.0:
- 1.0 = næsten identiske
- 0.7-0.9 = stærkt relaterede
- 0.5-0.7 = moderat relaterede
- 0.3-0.5 = svagt relaterede

Returner KUN par med score >= ${SCORE_MIN}.

Returner et JSON-objekt:
{"pairs": [{"other_id": "uuid-af-kandidat", "score": 0.75}]}

VIGTIGT: Brug de præcise UUID'er. Returner KUN valid JSON, ingen anden tekst.`;
}

async function callClaude(prompt: string): Promise<AIPair[]> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env("CLAUDE_KEY"),
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as AnthropicResponse;
  const textBlock = data.content?.find((b) => b.type === "text" && typeof b.text === "string");
  if (!textBlock?.text) return [];
  let text = textBlock.text.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  try {
    const parsed: { pairs?: AIPair[] } = JSON.parse(text);
    return parsed.pairs ?? [];
  } catch {
    return [];
  }
}

// ── Generation ──────────────────────────────────────────────────────

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function generateForAnchor(
  admin: SupabaseClient,
  anchor: Interest,
  others: Interest[],
  existingPairKeys: Set<string>,
): Promise<number> {
  if (others.length === 0) return 0;

  const validIds = new Set(others.map((o) => o.interest_id));
  const pairs = await callClaude(buildPrompt(anchor, others));

  const rows = pairs
    .filter((p) => validIds.has(p.other_id))
    .filter((p) => typeof p.score === "number" && p.score >= SCORE_MIN && p.score <= 1)
    .map((p) => {
      const [a, b] = orderPair(anchor.interest_id, p.other_id);
      return { interest_id_a: a, interest_id_b: b, score: Math.round(p.score * 100) / 100 };
    })
    // Drop pairs that already exist (whether AI or manual) so we don't
    // overwrite manual edits or burn a write on a no-op.
    .filter((r) => !existingPairKeys.has(`${r.interest_id_a}:${r.interest_id_b}`));

  if (rows.length === 0) return 0;

  const { error } = await admin
    .from("interest_relations")
    .upsert(rows.map((r) => ({ ...r, source: "ai" })), {
      onConflict: "interest_id_a,interest_id_b",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(error.message);

  // Track newly inserted pairs so subsequent anchors in the same batch don't
  // try to write the mirror pair.
  for (const r of rows) existingPairKeys.add(`${r.interest_id_a}:${r.interest_id_b}`);
  return rows.length;
}

// ── Handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "POST required" });

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;
    const { admin } = auth;

  let body: { mode?: "all" | "one"; interestId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode = body.mode ?? "all";

  const { data: interests, error: intErr } = await admin
    .from("interests")
    .select("interest_id, interest_da, category")
    .order("interest_da");
  if (intErr) return json(500, { error: `Kunne ikke hente interesser: ${intErr.message}` });
  if (!interests || interests.length < 2) return json(400, { error: "Mindst 2 interesser kræves." });

  const { data: existing, error: existErr } = await admin
    .from("interest_relations")
    .select("interest_id_a, interest_id_b");
  if (existErr) return json(500, { error: `Kunne ikke hente eksisterende relationer: ${existErr.message}` });

  const existingPairKeys = new Set(
    ((existing as ExistingRow[] | null) ?? []).map((r) => `${r.interest_id_a}:${r.interest_id_b}`),
  );
  const interestsHavingAnyRelation = new Set<string>();
  for (const r of (existing as ExistingRow[] | null) ?? []) {
    interestsHavingAnyRelation.add(r.interest_id_a);
    interestsHavingAnyRelation.add(r.interest_id_b);
  }

  let totalNew = 0;
  let anchorsProcessed = 0;

  try {
    if (mode === "one") {
      if (!body.interestId) return json(400, { error: "interestId mangler." });
      const anchor = (interests as Interest[]).find((i) => i.interest_id === body.interestId);
      if (!anchor) return json(404, { error: "Interesse ikke fundet." });
      const others = (interests as Interest[]).filter((i) => i.interest_id !== anchor.interest_id);
      totalNew += await generateForAnchor(admin, anchor, others, existingPairKeys);
      anchorsProcessed = 1;
    } else {
      // mode = "all": generate only for anchors that have no relations yet.
      const anchors = (interests as Interest[]).filter(
        (i) => !interestsHavingAnyRelation.has(i.interest_id),
      );
      for (const anchor of anchors) {
        const others = (interests as Interest[]).filter((i) => i.interest_id !== anchor.interest_id);
        totalNew += await generateForAnchor(admin, anchor, others, existingPairKeys);
        anchorsProcessed += 1;
      }
    }
  } catch (e) {
    return json(500, {
      error: e instanceof Error ? e.message : "Ukendt fejl",
      anchorsProcessed,
      count: totalNew,
    });
  }

  return json(200, { count: totalNew, anchorsProcessed });
  } catch (e) {
    console.error("generate-relations fatal:", e);
    return json(500, { error: e instanceof Error ? e.message : "Ukendt fejl" });
  }
});

import { INTEREST_PHRASES } from "./interestPhrases";

/** "cykle, løbe og spille tennis" */
const joinDanish = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} og ${items[items.length - 1]}`);

/**
 * A plain starter bio built from the user's own interest choices, shown
 * instantly while (or instead of) the AI suggestion. Only uses facts they gave
 * us, in the way a Dane would say it: "Jeg kan lide at cykle og løbe. Skriv,
 * hvis vi skal cykle en tur en dag."
 */
export function buildBioTemplate(interestNames: string[]): string {
  const names = interestNames.map((n) => n.trim().toLowerCase()).filter(Boolean).slice(0, 3);
  if (names.length === 0) return "";

  const phrases = names.map((n) => INTEREST_PHRASES[n]);
  const allKnown = phrases.every(Boolean);

  const likes = allKnown ? `Jeg kan lide at ${joinDanish(phrases.map((p) => p.like))}.` : `Jeg kan lide ${joinDanish(names)}.`;
  const invite = phrases[0] ? `Skriv, hvis vi skal ${phrases[0].invite}.` : "Skriv, hvis vi skal finde på noget sammen en dag.";

  return `${likes} ${invite}`;
}

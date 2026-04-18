// Shared thresholds and helpers for the interest_relations model.
// Kept in one place so the AI prompt, admin UI, buddy list, and buddy detail
// page all agree on what counts as "weak", "medium", and "strong" similarity.

export const SCORE_MIN = 0.3;
export const SCORE_MEDIUM = 0.5;
export const SCORE_STRONG = 0.7;

export type ScoreBucket = "weak" | "medium" | "strong";

export function getScoreBucket(score: number): ScoreBucket {
  if (score >= SCORE_STRONG) return "strong";
  if (score >= SCORE_MEDIUM) return "medium";
  return "weak";
}

export const SCORE_BADGE_CLASSES: Record<ScoreBucket, string> = {
  strong: "bg-green-100 text-green-800",
  medium: "bg-blue-100 text-blue-700",
  weak: "bg-yellow-100 text-yellow-800",
};

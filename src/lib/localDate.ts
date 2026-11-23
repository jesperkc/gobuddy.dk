/** Local date (YYYY-MM-DD), `daysAgo` days before today. */
export const dateLocal = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Noon local time, so the stored timestamp stays on the chosen day in any timezone. */
export const toActivityTimestamp = (date?: string) => (date ? new Date(`${date}T12:00:00`).toISOString() : undefined);

/** Generate a URL-friendly slug from a Danish string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Generate a profile slug: name + 4-char hex suffix */
export function profileSlug(firstName: string, profileId: string): string {
  const base = slugify(firstName || "buddy");
  const suffix = profileId.replace(/-/g, "").slice(0, 4);
  return `${base}-${suffix}`;
}

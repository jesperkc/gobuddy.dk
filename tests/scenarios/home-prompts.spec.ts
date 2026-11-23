import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { BLOCK_LABELS, installScenario, type Blocks, type Scenario } from "./home-fixtures";
import { renderGalleryHtml, renderMermaidDoc, type Result } from "./home-mermaid";

/**
 * Scenario gallery for the prompts on /home (bio, first post, best match, ...).
 *
 * Each scenario renders the real page with mocked Supabase data, records which
 * blocks are on screen, compares that with what we *believe* should show, and
 * saves a screenshot. Run it, then open docs/scenarios/home-prompts/index.html.
 *
 *   npx playwright test tests/scenarios/home-prompts.spec.ts
 */

const NONE: Blocks = { verifyBanner: false, bioPrompt: false, firstPostPrompt: false, bestMatch: false, noNearby: false, checklist: true };
const blocks = (b: Partial<Blocks>): Blocks => ({ ...NONE, ...b });

const base = {
  verified: true,
  bio: "written" as const,
  interests: ["run", "bike"] as Scenario["interests"],
  hasLocation: true,
  buddies: [] as Scenario["buddies"],
  hi5Sent: false,
  postedAbout: [] as Scenario["postedAbout"],
};
const nearRunner = { name: "Jonas", where: "near" as const, interests: ["run" as const, "tennis" as const] };

const SCENARIOS: Scenario[] = [
  // --- Not verified: the bio, then the first post, are the only things to do
  { ...base, id: "01-unverified-no-bio", title: "Unverified, no bio yet", why: "A brand-new signup that hasn't clicked the email link.", verified: false, bio: "none", expect: blocks({ verifyBanner: true, bioPrompt: true }) },
  { ...base, id: "02-unverified-bio-written", title: "Unverified, bio written", why: "The bio is done, so the first-post prompt takes over.", verified: false, expect: blocks({ verifyBanner: true, firstPostPrompt: true }) },
  { ...base, id: "03-unverified-bio-skipped", title: "Unverified, bio skipped", why: "Skipping the bio counts as answered.", verified: false, bio: "skipped", expect: blocks({ verifyBanner: true, firstPostPrompt: true }) },
  { ...base, id: "04-unverified-all-posted", title: "Unverified, already posted about every interest", why: "Nothing left to ask.", verified: false, postedAbout: ["run", "bike"], expect: blocks({ verifyBanner: true }) },
  { ...base, id: "05-unverified-no-interests", title: "Unverified, no interests", why: "Bio is still asked; the first-post prompt needs an interest to ask about.", verified: false, bio: "none", interests: [], expect: blocks({ verifyBanner: true, bioPrompt: true }) },

  // --- Verified, someone nearby shares an interest
  { ...base, id: "06-match-no-hi5-no-bio", title: "Verified, match nearby, no Hi5 yet, no bio", why: "Is the bio asked before the user has done anything with the match?", bio: "none", buddies: [nearRunner], surprising: "the bio is never asked until a Hi5 is sent", expect: blocks({ bestMatch: true }) },
  { ...base, id: "07-match-hi5-no-bio", title: "Verified, match nearby, Hi5 sent, no bio", why: "Saying hi unlocks the next ask, and the bio comes first.", bio: "none", buddies: [nearRunner], hi5Sent: true, expect: blocks({ bestMatch: true, bioPrompt: true }) },
  { ...base, id: "08-match-hi5-bio", title: "Verified, match nearby, Hi5 sent, bio written", why: "Bio done, so the first post is asked.", buddies: [nearRunner], hi5Sent: true, expect: blocks({ bestMatch: true, firstPostPrompt: true }) },
  { ...base, id: "09-match-hi5-bio-skipped", title: "Verified, match nearby, Hi5 sent, bio skipped", why: "A skipped bio must not block the first post.", bio: "skipped", buddies: [nearRunner], hi5Sent: true, expect: blocks({ bestMatch: true, firstPostPrompt: true }) },
  { ...base, id: "10-match-hi5-all-posted", title: "Verified, match nearby, Hi5 sent, all interests posted", why: "Nothing left to ask once every interest has a post.", buddies: [nearRunner], hi5Sent: true, postedAbout: ["run", "bike"], expect: blocks({ bestMatch: true }) },
  { ...base, id: "11-match-no-hi5-bio", title: "Verified, match nearby, no Hi5, bio written", why: "Without a Hi5 the first-post prompt stays hidden.", buddies: [nearRunner], surprising: "the first-post prompt stays hidden until a Hi5 is sent", expect: blocks({ bestMatch: true }) },

  // --- Verified, nobody nearby
  { ...base, id: "12-nobody-no-bio", title: "Verified, no buddies at all, no bio", why: "The empty state is the ask: bio first.", bio: "none", expect: blocks({ noNearby: true, bioPrompt: true }) },
  { ...base, id: "13-nobody-bio", title: "Verified, no buddies at all, bio written", why: "Empty state plus first-post prompt.", expect: blocks({ noNearby: true, firstPostPrompt: true }) },
  { ...base, id: "14-only-far-away", title: "Verified, only a shared-interest buddy 155 km away", why: "Outside the 50 km radius: the empty state names the nearest distance.", buddies: [{ name: "Signe", where: "far", interests: ["run"] }], expect: blocks({ noNearby: true, firstPostPrompt: true }) },
  { ...base, id: "15-nearby-no-shared-interest", title: "Verified, buddy nearby but no shared interest", why: "Nearby people without a shared interest don't count.", buddies: [{ name: "Mads", where: "near", interests: ["tennis"] }], expect: blocks({ noNearby: true, firstPostPrompt: true }) },

  // --- Edge cases
  { ...base, id: "16-verified-no-interests", title: "Verified, no interests chosen", why: "No interests means no match search at all. Does anything prompt?", interests: [], bio: "none", surprising: "no interests means no prompt at all, only the checklist", expect: blocks({}) },
  { ...base, id: "17-no-location-far-buddy", title: "Verified, no location set, buddy far away", why: "Unknown own position: is a distant buddy treated as 'nearby'?", hasLocation: false, buddies: [{ name: "Signe", where: "far", interests: ["run"] }], surprising: "without an own location, a buddy 155 km away is shown as the best match nearby", expect: blocks({ bestMatch: true }) },
];

const OUT = path.resolve("docs/scenarios/home-prompts");
const DIAGRAM = path.resolve("docs/scenarios/home-prompts.md");

const results: Result[] = [];

async function observe(page: Page): Promise<Blocks> {
  const visible = (l: ReturnType<Page["locator"]>) => l.first().isVisible();
  return {
    verifyBanner: await visible(page.getByText("Bekræft din email for at se buddies")),
    bioPrompt: await visible(page.getByRole("heading", { name: "Fortæl lidt om dig selv" })),
    firstPostPrompt: await visible(page.getByRole("heading", { name: /Hvornår lavede du sidst noget med/ })),
    bestMatch: await visible(page.locator('section[aria-labelledby="best-match-title"]')),
    noNearby: await visible(page.getByRole("heading", { name: /Der er ingen med dine interesser/ })),
    checklist: await visible(page.getByRole("heading", { name: "Gør din profil klar" })),
  };
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

for (const scenario of SCENARIOS) {
  test(`${scenario.id}: ${scenario.title}`, async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installScenario(page, scenario);

    await page.goto("/home");
    await expect(page.getByRole("heading", { name: /Maria/ })).toBeVisible();
    await page.waitForLoadState("networkidle");
    // Buddies and email status load after the first paint; let them settle.
    await page.waitForTimeout(600);

    const seen = await observe(page);
    await page.screenshot({ path: path.join(OUT, `${scenario.id}.png`), fullPage: true });

    const mismatches = (Object.keys(seen) as Array<keyof Blocks>).filter((k) => seen[k] !== scenario.expect[k]);
    results.push({ scenario, seen, mismatches });

    for (const key of Object.keys(seen) as Array<keyof Blocks>) {
      expect.soft(seen[key], `${BLOCK_LABELS[key]} should be ${scenario.expect[key] ? "visible" : "hidden"}`).toBe(scenario.expect[key]);
    }
  });
}

test.afterAll(() => {
  if (results.length === 0) return;
  fs.writeFileSync(path.join(OUT, "index.html"), renderGalleryHtml(results));
  fs.writeFileSync(DIAGRAM, renderMermaidDoc(results));
});

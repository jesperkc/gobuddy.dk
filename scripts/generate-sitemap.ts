import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const SITE_URL = "https://gobuddy.dk";

async function generateSitemap() {
  const staticRoutes = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/interesser", priority: "0.9", changefreq: "weekly" },
    { path: "/login", priority: "0.5", changefreq: "monthly" },
    { path: "/signup", priority: "0.6", changefreq: "monthly" },
  ];

  const { data: interests, error } = await supabase
    .from("interests")
    .select("interest_id")
    .eq("custom", false);

  if (error) {
    console.error("Error fetching interests:", error);
    process.exit(1);
  }

  const interestRoutes = (interests || []).map((i) => ({
    path: `/interesser/${i.interest_id}`,
    priority: "0.7",
    changefreq: "weekly",
  }));

  const allRoutes = [...staticRoutes, ...interestRoutes];
  const today = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  const outPath = resolve(__dirname, "../public/sitemap.xml");
  writeFileSync(outPath, xml, "utf-8");
  console.log(`✅ Sitemap generated with ${allRoutes.length} URLs → public/sitemap.xml`);
}

generateSitemap();

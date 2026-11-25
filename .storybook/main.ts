import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";
import { mergeConfig, type Plugin } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const realSupabase = path.resolve(root, "src/lib/supabase.ts");
const mockSupabase = path.resolve(import.meta.dirname, "mocks/supabase.ts");

/** Swap the real Supabase client for the in-memory one, however it is imported ("@/lib/supabase", "./supabase", "../lib/supabase"). */
const mockSupabasePlugin: Plugin = {
  name: "storybook-mock-supabase",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (!importer || !/supabase$/.test(source) || importer === mockSupabase) return null;
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    return resolved?.id.replace(/\?.*$/, "") === realSupabase ? mockSupabase : null;
  },
};

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: "@storybook/react-vite",
  viteFinal: (viteConfig) =>
    mergeConfig(
      {
        ...viteConfig,
        // The router plugin would rewrite app/routeTree.gen.ts while Storybook runs.
        plugins: (viteConfig.plugins ?? []).flat().filter((p) => !(p && "name" in p && /tanstack|router/i.test(p.name))),
      },
      { plugins: [mockSupabasePlugin] },
    ),
};

export default config;

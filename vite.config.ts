import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import svgr from "vite-plugin-svgr";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      routesDirectory: "./app/routes",
      generatedRouteTree: "./app/routeTree.gen.ts",
    }),
    svgr(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./app"),
    },
  },
  server: {
    port: 3002,
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});

import { defineConfig } from "@tanstack/start/config";
import { resolve } from "path";

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "~": resolve(__dirname, "./app"),
      },
    },
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
    define: {
      // Fix for browser compatibility issues with Node.js modules
      global: "globalThis",
    },
  },
  server: {
    preset: "vercel",
  },
});

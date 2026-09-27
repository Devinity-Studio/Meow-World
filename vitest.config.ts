import { defineConfig, defaultExclude } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    css: true,
    // Stale git worktrees contain old copies of tests — never run them.
    exclude: [...defaultExclude, "**/.kilo/worktrees/**"],
  },
});

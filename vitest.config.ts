import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
    },
  },
  resolve: {
    // Allow TypeScript path aliases for the test environment
    extensions: [".tsx", ".ts", ".js"],
  },
});

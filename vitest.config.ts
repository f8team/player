import { defineConfig } from "vitest/config";

/**
 * Root Vitest config. Each package has its own `vitest.config.ts` extending this
 * via Vitest's automatic per-workspace discovery (we keep it simple: each package
 * runs its own suite via `pnpm -r test`). This root config is the safety net for
 * any ad-hoc top-level tests (e.g., `tests/golden/**`).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["**/dist/**", "**/node_modules/**", "**/*.config.*", "**/*.test.*"],
    },
  },
});

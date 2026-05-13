export default {
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",
        "src/internal/index.ts",
        "src/**/*.test.ts",
        "src/**/types.ts",
        "src/types/**",
      ],
      // Phase 1 gates. Branches are intentionally one notch below the other
      // metrics because several catch/swallow paths exist that we exercise via
      // adapter integration in Phase 2 — re-tighten there.
      thresholds: {
        statements: 95,
        branches: 85,
        functions: 95,
        lines: 95,
      },
    },
  },
};

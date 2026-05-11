import { describe, expect, it } from "vitest";

/**
 * Phase 0 sanity test. Proves the toolchain is wired correctly:
 * `pnpm test` discovers, runs, and reports a passing test before any source
 * code exists. Replaced by per-package suites starting at Phase 1.
 */
describe("phase-0 toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });

  it("uses TypeScript strict mode", () => {
    const value: number = 42;
    expect(value).toBe(42);
  });
});

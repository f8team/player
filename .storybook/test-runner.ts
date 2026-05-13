import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { TestRunnerConfig } from "@storybook/test-runner";
import { getStoryContext } from "@storybook/test-runner";
import { checkA11y, configureAxe, injectAxe } from "axe-playwright";
import { toMatchImageSnapshot } from "jest-image-snapshot";

const SNAPSHOT_ROOT = resolve(__dirname, "../__image_snapshots__");
if (!existsSync(SNAPSHOT_ROOT)) {
  mkdirSync(SNAPSHOT_ROOT, { recursive: true });
}

// jest-image-snapshot extends Jest's `expect`. Jest globals only exist inside
// `setup`/test scope, so we register the matcher there (not at module load).
let snapshotMatcherInstalled = false;
function ensureSnapshotMatcher(): void {
  if (snapshotMatcherInstalled) return;
  const globalExpect = (globalThis as { expect?: { extend: (m: unknown) => void } }).expect;
  if (!globalExpect) return;
  globalExpect.extend({ toMatchImageSnapshot });
  snapshotMatcherInstalled = true;
}

interface SnapshotConfig {
  enabled?: boolean;
  failureThreshold?: number;
  failureThresholdType?: "pixel" | "percent";
}

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);

    // ─── A11y (axe-playwright) ───────────────────────────────────────────
    if (!storyContext.parameters?.a11y?.disable) {
      await configureAxe(page, {
        rules: storyContext.parameters?.a11y?.config?.rules,
      });
      await checkA11y(page, "#storybook-root", {
        detailedReport: true,
        detailedReportOptions: { html: true },
        axeOptions: storyContext.parameters?.a11y?.options,
      });
    }

    // ─── Visual snapshot (jest-image-snapshot) ─────────────────────────
    // Opt-in per story via `parameters.snapshot.enabled = true`. Tolerance
    // tuned for the 4 theme stories that gate visual regressions.
    const snap = storyContext.parameters?.snapshot as SnapshotConfig | undefined;
    if (!snap?.enabled) return;

    ensureSnapshotMatcher();

    // Wait for fonts + first paint so subsequent diffs are stable. We avoid
    // `networkidle` because HLS test streams keep XHR pings going forever and
    // the visual snapshot only needs the chrome (controls + theme).
    await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
    await page.waitForTimeout(200);

    const root = await page.$("#storybook-root");
    if (!root) return;

    const image = await root.screenshot({ type: "png", animations: "disabled" });
    const fileName = context.id.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const customSnapshotsDir = dirname(resolve(SNAPSHOT_ROOT, fileName));
    if (!existsSync(customSnapshotsDir)) {
      mkdirSync(customSnapshotsDir, { recursive: true });
    }
    expect(image).toMatchImageSnapshot({
      customSnapshotsDir,
      customSnapshotIdentifier: fileName,
      failureThreshold: snap.failureThreshold ?? 0.01,
      failureThresholdType: snap.failureThresholdType ?? "percent",
      comparisonMethod: "ssim",
    });
  },
};

export default config;

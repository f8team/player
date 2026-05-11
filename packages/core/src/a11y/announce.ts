/**
 * Single shared off-screen `aria-live` region. Adapters / plugins call
 * `announce("Subtitles on")` to push messages to assistive tech without
 * jumping focus.
 *
 * The region is created lazily (so SSR-only consumers pay nothing) and
 * polite by default. Screen readers respect rate-limit conventions, so
 * announcements queue up and read sequentially.
 */

const REGION_ID = "f8-player-live-region";

let region: HTMLElement | null = null;

function ensureRegion(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  if (region && region.isConnected) return region;
  const existing = document.getElementById(REGION_ID);
  if (existing) {
    region = existing;
    return region;
  }
  const node = document.createElement("div");
  node.id = REGION_ID;
  node.setAttribute("aria-live", "polite");
  node.setAttribute("aria-atomic", "true");
  node.setAttribute("role", "status");
  // Visually hidden, but exposed to screen readers.
  Object.assign(node.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: "0",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(node);
  region = node;
  return region;
}

/**
 * Announce a message to assistive tech. No-op outside the browser.
 *
 * Subsequent calls with the same string force a fresh DOM mutation (we
 * blank the region for one frame) so screen readers re-read identical
 * messages — useful for repeated state toggles like Mute on/off.
 */
export function announce(message: string): void {
  if (!message) return;
  const node = ensureRegion();
  if (!node) return;
  if (node.textContent === message) {
    node.textContent = "";
  }
  // Microtask delay — gives the screen reader a chance to notice the empty
  // mutation when re-announcing the same string.
  queueMicrotask(() => {
    if (node.isConnected) node.textContent = message;
  });
}

/** @internal — drop the live region. Used by the test cleanup hooks. */
export function _disposeAnnounce(): void {
  if (region && region.parentElement) region.parentElement.removeChild(region);
  region = null;
}

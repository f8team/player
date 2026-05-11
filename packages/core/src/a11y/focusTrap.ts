/**
 * Minimal focus trap helper.
 *
 * Used by adapters in fullscreen so Tab / Shift+Tab stays inside the player.
 * Not a replacement for full focus-management libraries (focus-trap-react)
 * — but enough for the player's small, well-known interactive surface.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]",
].join(",");

function isFocusable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hidden) return false;
  if (el.tabIndex === -1) return false;
  // Production DOM gives us a layout-aware visibility check. We can't trust
  // it in jsdom (where offsetParent often stays null until layout flushes).
  // The selector already excludes `disabled` and `tabindex="-1"`; that's
  // enough to keep the API honest.
  return true;
}

function focusables(container: HTMLElement): HTMLElement[] {
  const all = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return all.filter(isFocusable);
}

export interface FocusTrap {
  /** Activate the trap. Optionally focuses the first focusable. */
  activate(opts?: { focusFirst?: boolean }): void;
  /** Deactivate. Optionally restores focus to the previously focused element. */
  deactivate(opts?: { restoreFocus?: boolean }): void;
}

/**
 * Build a focus trap rooted at `container`.
 *
 * The trap installs a `keydown` listener and rotates focus among the
 * descendants matching `FOCUSABLE_SELECTOR` when Tab/Shift+Tab fires near
 * the boundary.
 */
export function createFocusTrap(container: HTMLElement): FocusTrap {
  let active = false;
  let previouslyFocused: Element | null = null;

  function onKeyDown(event: KeyboardEvent): void {
    if (!active) return;
    if (event.key !== "Tab") return;
    const items = focusables(container);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const current = document.activeElement;
    if (event.shiftKey) {
      if (current === first || !container.contains(current)) {
        event.preventDefault();
        last.focus();
      }
    } else if (current === last || !container.contains(current)) {
      event.preventDefault();
      first.focus();
    }
  }

  function activate(opts: { focusFirst?: boolean } = {}): void {
    if (active) return;
    active = true;
    previouslyFocused = document.activeElement;
    container.addEventListener("keydown", onKeyDown, true);
    if (opts.focusFirst) {
      const items = focusables(container);
      items[0]?.focus();
    }
  }

  function deactivate(opts: { restoreFocus?: boolean } = {}): void {
    if (!active) return;
    active = false;
    container.removeEventListener("keydown", onKeyDown, true);
    if (opts.restoreFocus && previouslyFocused instanceof HTMLElement) {
      try {
        previouslyFocused.focus();
      } catch {
        // ignore
      }
    }
    previouslyFocused = null;
  }

  return { activate, deactivate };
}

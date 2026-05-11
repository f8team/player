import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createFocusTrap } from "./focusTrap.js";

function setup(): { container: HTMLElement; first: HTMLButtonElement; last: HTMLButtonElement } {
  document.body.innerHTML = `
    <button id="outside">outside</button>
    <div id="container">
      <button id="first">first</button>
      <button id="middle">middle</button>
      <button id="last">last</button>
    </div>
  `;
  const container = document.getElementById("container") as HTMLElement;
  const first = document.getElementById("first") as HTMLButtonElement;
  const last = document.getElementById("last") as HTMLButtonElement;
  return { container, first, last };
}

function press(target: Element, key: string, opts: { shift?: boolean } = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: opts.shift ?? false,
  });
  target.dispatchEvent(event);
  return event;
}

describe("createFocusTrap", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("focuses the first item on activate({ focusFirst: true })", () => {
    const { container, first } = setup();
    const trap = createFocusTrap(container);
    trap.activate({ focusFirst: true });
    expect(document.activeElement).toBe(first);
    trap.deactivate();
  });

  it("Tab from the last focusable wraps to the first", () => {
    const { container, first, last } = setup();
    const trap = createFocusTrap(container);
    trap.activate();
    last.focus();
    const event = press(last, "Tab");
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    trap.deactivate();
  });

  it("Shift+Tab from the first wraps to the last", () => {
    const { container, first, last } = setup();
    const trap = createFocusTrap(container);
    trap.activate();
    first.focus();
    const event = press(first, "Tab", { shift: true });
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    trap.deactivate();
  });

  it("ignores non-Tab keys", () => {
    const { container } = setup();
    const trap = createFocusTrap(container);
    trap.activate();
    const event = press(container, "Enter");
    expect(event.defaultPrevented).toBe(false);
    trap.deactivate();
  });

  it("activate is idempotent", () => {
    const { container, first } = setup();
    const trap = createFocusTrap(container);
    trap.activate({ focusFirst: true });
    trap.activate({ focusFirst: true });
    expect(document.activeElement).toBe(first);
    trap.deactivate();
  });

  it("deactivate restores focus when restoreFocus=true", () => {
    const { container } = setup();
    const outside = document.getElementById("outside") as HTMLButtonElement;
    outside.focus();
    expect(document.activeElement).toBe(outside);
    const trap = createFocusTrap(container);
    trap.activate({ focusFirst: true });
    trap.deactivate({ restoreFocus: true });
    expect(document.activeElement).toBe(outside);
  });

  it("deactivate is idempotent", () => {
    const { container } = setup();
    const trap = createFocusTrap(container);
    trap.activate();
    trap.deactivate();
    expect(() => trap.deactivate()).not.toThrow();
  });

  it("preventDefault when there are no focusable items", () => {
    document.body.innerHTML = '<div id="empty"></div>';
    const empty = document.getElementById("empty") as HTMLElement;
    const trap = createFocusTrap(empty);
    trap.activate();
    const event = press(empty, "Tab");
    expect(event.defaultPrevented).toBe(true);
    trap.deactivate();
  });

  it("after deactivate, Tab is no longer trapped", () => {
    const { container, last } = setup();
    const trap = createFocusTrap(container);
    trap.activate();
    trap.deactivate();
    last.focus();
    const event = press(last, "Tab");
    expect(event.defaultPrevented).toBe(false);
  });
});

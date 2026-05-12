/**
 * Clears focus from any focused descendant of `container`.
 *
 * Used on pointer leave of the `[data-f8-player]` wrapper so `:focus-within`
 * does not keep the controls bar visible after a mouse click on a control.
 */
export function blurFocusInside(container: Element): void {
  const ae = document.activeElement;
  if (ae instanceof HTMLElement && container.contains(ae)) {
    ae.blur();
  }
}

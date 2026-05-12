import { type ComponentPropsWithoutRef } from "react";

import { useLabels } from "../../i18n.js";

export type ControlsBarProps = ComponentPropsWithoutRef<"div">;

/**
 * `<Player.Controls.Bar>` — a flex container for player controls. Forwards all
 * div props.
 *
 * Place inside `<Player.Root>` alongside `<Player.Video>`. The children are
 * your control atoms (`<Player.Controls.PlayPause>`, etc.).
 *
 * ARIA: `role="toolbar"`, `aria-label` reads `labels.controlsBar`. Pass a
 * custom `aria-label` prop to override per-instance.
 */
export function Bar({
  children,
  className,
  style,
  "aria-label": ariaLabel,
  ...rest
}: ControlsBarProps): JSX.Element {
  const labels = useLabels();
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel ?? labels.controlsBar}
      className={className}
      style={style}
      data-f8-player-controls=""
      {...rest}
    >
      {children}
    </div>
  );
}

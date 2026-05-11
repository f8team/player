import { type ComponentPropsWithoutRef } from "react";

export type ControlsBarProps = ComponentPropsWithoutRef<"div">;

/**
 * `<Player.Controls.Bar>` — a flex container for player controls. Forwards all
 * div props.
 *
 * Place inside `<Player.Root>` alongside `<Player.Video>`. The children are
 * your control atoms (`<Player.Controls.PlayPause>`, etc.).
 */
export function Bar({ children, className, style, ...rest }: ControlsBarProps): JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label="Điều khiển video"
      className={className}
      style={style}
      data-f8-player-controls=""
      {...rest}
    >
      {children}
    </div>
  );
}

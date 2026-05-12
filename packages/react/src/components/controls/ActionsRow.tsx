import { type ComponentPropsWithoutRef } from "react";

export type ActionsRowProps = ComponentPropsWithoutRef<"div">;

/**
 * Second row of the stock **two-row** controls shell (transport, volume, quality, …).
 * Pair with {@link TimelineRow} and {@link Bar} `layout="two-row"`.
 */
export function ActionsRow({ ...props }: ActionsRowProps): JSX.Element {
  return <div data-f8-player-controls-row="actions" {...props} />;
}

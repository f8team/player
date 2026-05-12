import { type ComponentPropsWithoutRef } from "react";

export type TimelineRowProps = ComponentPropsWithoutRef<"div">;

/**
 * First row of the stock **two-row** controls shell: `[current time][seek][duration]`.
 * Pair with {@link ActionsRow} and {@link Bar} `layout="two-row"`.
 */
export function TimelineRow({ ...props }: TimelineRowProps): JSX.Element {
  return <div data-f8-player-controls-row="timeline" {...props} />;
}

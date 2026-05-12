import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

export interface KeyboardPluginOptions {
  /**
   * Where to attach the keyboard listener.
   * - `"global"` (default) — `document` (whole page).
   * - `"container"` — element returned by `getContainer()`. Use when the
   *   player is embedded in a page with its own hotkeys (G16).
   * - `"off"` — disable keyboard handling entirely.
   */
  scope?: "global" | "container" | "off";
  /**
   * Seek step in seconds for ArrowLeft / ArrowRight. Defaults to 5.
   */
  seekStep?: number;
  /**
   * Seek step for Shift+Arrow. Defaults to 10.
   */
  longSeekStep?: number;
  /**
   * Callback to resolve the container element for `scope="container"`.
   * If not provided, the player's attached `<video>` element's parent is used.
   */
  getContainer?: () => Element | null;
}

const PLUGIN_NAME = "keyboard";

/**
 * Keyboard shortcuts plugin.
 *
 * | Key              | Action                                       |
 * |------------------|----------------------------------------------|
 * | Space / K        | Play / Pause toggle                          |
 * | ArrowLeft        | Seek back `seekStep` s (default 5 s)         |
 * | ArrowRight       | Seek forward `seekStep` s (default 5 s)      |
 * | Shift+ArrowLeft  | Seek back `longSeekStep` s (default 10 s)    |
 * | Shift+ArrowRight | Seek forward `longSeekStep` s (default 10 s) |
 * | ArrowUp          | Volume +0.1                                  |
 * | ArrowDown        | Volume -0.1                                  |
 * | M                | Toggle muted                                 |
 * | F                | Toggle fullscreen (`fullscreen:toggle`)       |
 * | P                | Toggle PiP (`pip:toggle`)                    |
 *
 * Golden cases: G1 (course lesson keyboard nav), G16 (container-scoped).
 */
export function createKeyboardPlugin(options: KeyboardPluginOptions = {}): PluginInstance {
  const { scope = "global", seekStep = 5, longSeekStep = 10, getContainer } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      if (scope === "off") return () => undefined;

      const handler = (e: KeyboardEvent): void => {
        // Ignore when focus is inside an interactive element.
        const tag = (e.target as Element | null)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;

        const state = player.getState();

        switch (e.key) {
          case " ":
          case "k":
          case "K":
            e.preventDefault();
            if (state.status === "playing") {
              player.pause();
            } else {
              player.play().catch(() => undefined);
            }
            break;

          case "ArrowLeft":
            e.preventDefault();
            player.seekTo(Math.max(0, state.currentTime - (e.shiftKey ? longSeekStep : seekStep)));
            break;

          case "ArrowRight":
            e.preventDefault();
            player.seekTo(
              Math.min(state.duration, state.currentTime + (e.shiftKey ? longSeekStep : seekStep)),
            );
            break;

          case "ArrowUp":
            e.preventDefault();
            player.setVolume(Math.min(1, state.volume + 0.1));
            break;

          case "ArrowDown":
            e.preventDefault();
            player.setVolume(Math.max(0, state.volume - 0.1));
            break;

          case "m":
          case "M":
            e.preventDefault();
            player.setMuted(!state.muted);
            break;

          case "f":
          case "F":
            e.preventDefault();
            host.commands.run("fullscreen:toggle");
            break;

          case "p":
          case "P":
            e.preventDefault();
            host.commands.run("pip:toggle");
            break;

          default:
            break;
        }
      };

      let target: Element | Document | null = null;

      if (scope === "global") {
        target = document;
        document.addEventListener("keydown", handler as EventListener);
      } else {
        // container scope — attach lazily once we know the container
        const container = getContainer?.() ?? (player.getState().source ? null : null); // placeholder
        if (container) {
          target = container;
          (container as HTMLElement).addEventListener("keydown", handler as EventListener);
        }
        // Also register via the command so the adapter can call install() after mount.
        host.commands.add("keyboard:installOnContainer", (el: unknown) => {
          if (el instanceof Element) {
            target = el;
            (el as HTMLElement).addEventListener("keydown", handler as EventListener);
          }
        });
      }

      return () => {
        if (target) {
          (target as HTMLElement | Document).removeEventListener(
            "keydown",
            handler as EventListener,
          );
        }
      };
    },
  };
}

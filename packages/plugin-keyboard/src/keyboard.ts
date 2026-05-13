import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

/**
 * Logical key names used by `blockKeys`. Mirrors `KeyboardEvent.key` for
 * arrows + the rendered char for letter shortcuts. `"Space"` is the friendly
 * alias for `" "` (Space), since `KeyboardEvent.key` returns the literal space.
 */
export type KeyboardKeyName =
  | "Space"
  | "K"
  | "M"
  | "F"
  | "P"
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown";

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
  /**
   * Selectively block individual hotkeys without disabling the entire plugin.
   *
   * Replaces the boilerplate `KeyboardHandler` consumers wrote when they only
   * needed to block Space (auth-gated story) but keep arrow seek working.
   *
   * Default `[]` (no keys blocked). Updated at runtime via
   * `keyboard:setBlockKeys(codes)` command.
   *
   * @phase-3-target T3.3
   */
  blockKeys?: readonly KeyboardKeyName[];
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
 * Commands registered on the player:
 * - `keyboard:installOnContainer(el)` — for `scope="container"`.
 * - `keyboard:disable()` / `keyboard:enable()` — temporarily suppress all
 *   hotkeys (use when a modal/dialog overlays the player).
 *
 * Golden cases: G1 (course lesson keyboard nav), G16 (container-scoped).
 */
/** Map a `KeyboardEvent` to the logical key name used by `blockKeys`. */
function keyNameOf(e: KeyboardEvent): KeyboardKeyName | null {
  switch (e.key) {
    case " ":
      return "Space";
    case "k":
    case "K":
      return "K";
    case "m":
    case "M":
      return "M";
    case "f":
    case "F":
      return "F";
    case "p":
    case "P":
      return "P";
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      return e.key;
    default:
      return null;
  }
}

export function createKeyboardPlugin(options: KeyboardPluginOptions = {}): PluginInstance {
  const {
    scope = "global",
    seekStep = 5,
    longSeekStep = 10,
    getContainer,
    blockKeys = [],
  } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      if (scope === "off") return () => undefined;

      // Runtime enable flag — flipped via `keyboard:disable` / `keyboard:enable`
      // commands so consumers (modals, quiz overlays, transient dialogs) can
      // temporarily suppress hotkeys without re-registering the plugin.
      let enabled = true;
      // Mutable blocked-key set. Updated via `keyboard:setBlockKeys(codes)` at
      // runtime so the consumer can flip individual keys without re-registering.
      let blocked = new Set<KeyboardKeyName>(blockKeys);

      const handler = (e: KeyboardEvent): void => {
        if (!enabled) return;
        // Granular per-key block — runs before the focus-target guard so a
        // blocked key never reaches the player even from container scope.
        const keyName = keyNameOf(e);
        if (keyName && blocked.has(keyName)) return;
        // Ignore when focus is inside an interactive element. Beyond
        // form controls we also need to skip:
        //   - `contenteditable` regions (rich-text editors, comments,
        //     quiz overlays) — without this the user typing Space
        //     toggles play/pause from inside their text composer (A7).
        //   - IME composition (`isComposing` / keyCode 229) — Vietnamese,
        //     Japanese, Korean, Chinese input methods send keystrokes
        //     through a composition session that should NEVER trigger
        //     player commands (A7).
        //   - Elements with `role="textbox"` (custom inputs).
        const target = e.target as (Element & { isContentEditable?: boolean }) | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        if (target?.isContentEditable) return;
        if (target?.getAttribute?.("role") === "textbox") return;
        if (e.isComposing || e.keyCode === 229) return;

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

      // Track every element we've attached to so install/uninstall stays
      // correct even if `keyboard:installOnContainer` is called multiple
      // times or the same plugin handles both an initial container and a
      // later one (modal opens, then closes, then opens again — A6).
      const attached: Set<Element | Document> = new Set();
      const attach = (el: Element | Document): void => {
        if (attached.has(el)) return;
        attached.add(el);
        (el as HTMLElement | Document).addEventListener("keydown", handler as EventListener);
      };

      if (scope === "global") {
        attach(document);
      } else {
        // container scope — try the user-provided getContainer first. If
        // it returns null we wait for the consumer to call
        // `keyboard:installOnContainer` after mount. Previously this
        // branch contained a `(player.getState().source ? null : null)`
        // placeholder that ALWAYS evaluated to null, so the listener was
        // never attached even when getContainer was provided (A6).
        const initial = getContainer?.() ?? null;
        if (initial) attach(initial);

        // Also register via the command so adapters can install after mount.
        host.commands.add("keyboard:installOnContainer", (el: unknown) => {
          if (el instanceof Element) attach(el);
        });
      }

      // Runtime enable/disable commands. Generic enough to publish OSS — useful
      // for any consumer that needs to suppress hotkeys while a modal/dialog
      // is up (F8 quiz overlay, paywall, settings sheet, …).
      host.commands.add("keyboard:disable", () => {
        enabled = false;
      });
      host.commands.add("keyboard:enable", () => {
        enabled = true;
      });

      // Granular block list. Pass the full replacement list — empty array
      // unblocks everything, a non-empty array overrides the previous set.
      // Phase 3 T3.3: replaces the consumer-side `KeyboardHandler` boilerplate.
      host.commands.add("keyboard:setBlockKeys", (codes: unknown) => {
        if (!Array.isArray(codes)) return;
        blocked = new Set<KeyboardKeyName>(codes as KeyboardKeyName[]);
      });

      return () => {
        for (const el of attached) {
          try {
            (el as HTMLElement | Document).removeEventListener("keydown", handler as EventListener);
          } catch {
            // ignore — element may have been removed from the DOM
          }
        }
        attached.clear();
      };
    },
  };
}

import { createPlayer } from "@f8/player-core";
import type { Disposer, Player, PlayerEvents, PlayerOptions, PlayerState } from "@f8/player-core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Reactive Controller that owns one `createPlayer(options)` instance for a Lit
 * host element. Mirrors the React adapter's `<Player.Root>` semantics:
 *
 * - `createPlayer` is called once on first host connection; options are read
 *   once and subsequent changes are ignored (use `player.setSource` etc. for
 *   reactive updates — same contract as `@f8/player-react`).
 * - The controller subscribes to the player's state store and requests a host
 *   update on every state change, so Lit re-renders only when the slice the
 *   `render()` reads actually changed.
 * - On `hostDisconnected`, the controller disposes every subscription and the
 *   underlying player.
 *
 * Typical use inside a `LitElement`:
 *
 * ```ts
 * class MyElement extends LitElement {
 *   readonly player = new PlayerController(this, () => this.options);
 *
 *   render() {
 *     return html`<video ${ref(this.player.attachVideo)}></video>`;
 *   }
 * }
 * ```
 */
export class PlayerController implements ReactiveController {
  /** Underlying core player. `null` until the host is first connected. */
  player: Player | null = null;

  private readonly host: ReactiveControllerHost;
  private readonly getOptions: () => PlayerOptions | undefined;
  private disposeStore: Disposer | null = null;
  private eventDisposers: Disposer[] = [];

  constructor(host: ReactiveControllerHost, getOptions: () => PlayerOptions | undefined) {
    this.host = host;
    this.getOptions = getOptions;
    host.addController(this);
  }

  hostConnected(): void {
    if (this.player) return;
    this.player = createPlayer(this.getOptions() ?? {});
    // Request re-render whenever the state store changes.
    this.disposeStore = this.player.subscribe<PlayerState>(
      (s) => s,
      () => this.host.requestUpdate(),
    );
  }

  hostDisconnected(): void {
    for (const dispose of this.eventDisposers) dispose();
    this.eventDisposers = [];
    if (this.disposeStore) {
      this.disposeStore();
      this.disposeStore = null;
    }
    this.player?.dispose();
    this.player = null;
  }

  /**
   * Subscribe to a typed core event. The returned disposer is also tracked by
   * the controller and called automatically on `hostDisconnected`.
   */
  on<K extends keyof PlayerEvents>(
    event: K,
    handler: (payload: PlayerEvents[K]) => void,
  ): Disposer {
    if (!this.player) {
      throw new Error("[@f8/player-lit] PlayerController.on() called before hostConnected.");
    }
    const dispose = this.player.on(event, handler);
    this.eventDisposers.push(dispose);
    return () => {
      dispose();
      this.eventDisposers = this.eventDisposers.filter((d) => d !== dispose);
    };
  }

  /**
   * Attach to a `<video>` element. Idempotent: calling twice with the same
   * element is a no-op; calling with a different element detaches the previous.
   */
  attach(video: HTMLVideoElement): Promise<void> {
    if (!this.player) {
      return Promise.reject(new Error("[@f8/player-lit] attach() called before hostConnected."));
    }
    return this.player.attach(video);
  }

  /** Detach the current `<video>` without disposing the player. */
  detach(): void {
    this.player?.detach();
  }
}

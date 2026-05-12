import { formatTime } from "@f8/player-core";
import type { Player, PlayerEvents, PlayerOptions, PlayerState } from "@f8/player-core";
import { LitElement, html, css } from "lit";

import { PlayerController } from "./PlayerController.js";

/**
 * `<f8-player>` — Lit custom element wrapping `@f8/player-core`.
 *
 * ## Usage
 *
 * ```html
 * <f8-player .options=${{ source: { src: "https://cdn/video.m3u8" } }}>
 *   <!-- Optional consumer-supplied chrome (overlays, controls, markers) -->
 *   <my-controls slot="controls"></my-controls>
 * </f8-player>
 * ```
 *
 * ## Public API
 *
 * - `play()`, `pause()`, `paused()`, `seekTo(seconds)`, `restore()` — shape-
 *   compatible with the React adapter's `PlayerHandle` so the same imperative
 *   contract works across React, Lit, and plain custom-element consumers.
 *   Golden case G12.
 * - `raw` — access the underlying `Player` for advanced operations (plugins,
 *   commands, source switching).
 *
 * ## Events
 *
 * Every core event is re-emitted as a `CustomEvent` with name
 * `f8-player:<event>` and `detail` set to the core payload. Listen via DOM:
 *
 * ```js
 * el.addEventListener("f8-player:timeupdate", (e) => console.log(e.detail));
 * ```
 *
 * ## Light DOM
 *
 * The element renders into its **light DOM** (`createRenderRoot` returns
 * `this`), not a shadow root. This keeps native `<track>` captions, fullscreen
 * APIs, and CSS theming (`classroom.css`, `story.css`, `admin.css`) working
 * without piercing shadow boundaries.
 */
export class F8PlayerElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
    }
    [data-f8-player-video] {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;

  /**
   * `createPlayer` options. Read once on `hostConnected`; subsequent changes
   * are ignored (same contract as `@f8/player-react`). Use the imperative
   * `raw.setSource(...)` / `raw.setPlaybackRate(...)` for reactive updates.
   */
  options?: PlayerOptions;

  /**
   * CSS class forwarded to the inner `<video>`.
   */
  videoClass?: string;

  /**
   * Render the reusable default F8 controls chrome. Consumers that need a
   * bespoke UI can leave this false and provide their own light-DOM controls.
   */
  controls = false;

  /**
   * Theme name consumed by `@f8/player-themes/*`. Only applied when default
   * controls are enabled so headless consumers stay visually untouched.
   */
  theme = "classroom";

  /** Reactive controller — owns the player lifecycle. */
  readonly controller = new PlayerController(this, () => this.options);

  /** The `<video>` element after `firstUpdated`. */
  private videoEl: HTMLVideoElement | null = null;

  /** Time captured on the most recent `pause()`, used by `restore()`. */
  private lastPausedTime = 0;

  /** Forward declaration for typed re-emission setup. */
  private bridgesInstalled = false;

  static override properties = {
    options: { attribute: false },
    videoClass: { attribute: "video-class" },
    controls: { type: Boolean, reflect: true },
    theme: { type: String },
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.syncHostChromeAttributes();
  }

  protected override updated(): void {
    this.syncHostChromeAttributes();
  }

  /** Render into light DOM — see class docstring. */
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override firstUpdated(): void {
    const video = this.querySelector<HTMLVideoElement>("video[data-f8-player-video]");
    if (!video) return;
    this.videoEl = video;
    this.controller.attach(video).catch(() => {
      // Surface via the player's "error" event; nothing to do here.
    });
    this.installEventBridges();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.videoEl = null;
    this.bridgesInstalled = false;
  }

  protected override render(): unknown {
    return html`
      <video data-f8-player-video class=${this.videoClass ?? ""} playsinline></video>
      <slot></slot>
      ${this.controls ? this.renderDefaultControls() : null}
      <slot name="controls"></slot>
    `;
  }

  // ------------------------------------------------------------------------
  // Imperative API (shape-compat with PlayerHandle / legacy VideoPlayerHandle)
  // ------------------------------------------------------------------------

  /** Start playback. Resolves once the underlying play() promise settles. */
  play(): Promise<void> {
    const p = this.controller.player;
    if (!p) return Promise.resolve();
    return p.play();
  }

  /** Pause playback. Captures `currentTime` for `restore()`. */
  pause(): void {
    const p = this.controller.player;
    if (!p) return;
    this.lastPausedTime = p.getCurrentTime();
    p.pause();
  }

  /** Whether playback is currently paused. */
  paused(): boolean {
    return this.controller.player?.paused() ?? true;
  }

  /** Seek to `seconds`. Clamped by the core to `[0, duration]`. */
  seekTo(seconds: number): void {
    this.controller.player?.seekTo(seconds);
  }

  /**
   * Resume the position captured at the last `pause()` and call `play()`.
   * Alias for back-compat with the legacy F8 `VideoPlayerHandle.restore`.
   */
  restore(): Promise<void> {
    const p = this.controller.player;
    if (!p) return Promise.resolve();
    if (this.lastPausedTime > 0) p.seekTo(this.lastPausedTime);
    return p.play();
  }

  /** Underlying core player. `null` before the element is connected. */
  get raw(): Player | null {
    return this.controller.player;
  }

  private syncHostChromeAttributes(): void {
    if (!this.controls) {
      this.removeAttribute("data-f8-player");
      this.removeAttribute("data-theme");
      this.removeAttribute("data-controls-visible");
      return;
    }

    this.setAttribute("data-f8-player", "");
    this.setAttribute("data-theme", this.theme || "classroom");
    // Keep the standard theme visible until hover/focus auto-hide is tuned by
    // each consumer. This mirrors the "operable first" contract of React controls.
    this.setAttribute("data-controls-visible", "");
  }

  private getStateSnapshot(): PlayerState | null {
    return this.controller.player?.getState() ?? null;
  }

  private renderDefaultControls(): unknown {
    const state = this.getStateSnapshot();
    const currentTime = state?.currentTime ?? 0;
    const duration = state?.duration ?? 0;
    const max = Number.isFinite(duration) && duration > 0 ? duration : 1;
    const isPlaying = state?.status === "playing";
    const muted = state?.muted ?? false;
    const volume = state?.volume ?? 1;
    const fullscreen = state?.fullscreen ?? false;

    return html`
      <div class="f8p-seek">
        <input
          type="range"
          min="0"
          max=${max}
          step="0.1"
          .value=${String(Math.min(currentTime, max))}
          role="slider"
          aria-label="Vị trí phát"
          aria-valuenow=${currentTime}
          aria-valuemin="0"
          aria-valuemax=${max}
          data-f8-player-control="seek-bar"
          @input=${this.handleSeekInput}
        />
      </div>

      <div class="f8p-controls" role="toolbar" aria-label="Điều khiển video" data-f8-player-controls>
        <button
          type="button"
          class="f8p-btn"
          aria-label=${isPlaying ? "Tạm dừng" : "Phát"}
          aria-pressed=${isPlaying}
          data-f8-player-control="play-pause"
          @click=${this.handlePlayPauseClick}
        >
          ${isPlaying ? "⏸" : "▶"}
        </button>

        <time
          class="f8p-time"
          aria-label=${`Vị trí hiện tại: ${this.formatTimeLabel(currentTime)}`}
          dateTime=${this.toDateTime(currentTime)}
          data-f8-player-control="time"
          data-variant="current"
        >
          ${this.formatTimeLabel(currentTime)}
        </time>

        <time
          class="f8p-time"
          aria-label=${`Thời lượng: ${this.formatTimeLabel(duration)}`}
          dateTime=${this.toDateTime(duration)}
          data-f8-player-control="time"
          data-variant="duration"
        >
          ${this.formatTimeLabel(duration)}
        </time>

        <div class="f8p-spacer"></div>

        ${this.renderQualityControl(state)}
        ${this.renderPlaybackRateControl(state)}

        <div class="f8p-volume">
          <button
            type="button"
            class="f8p-btn"
            aria-label=${muted ? "Bật tiếng" : "Tắt tiếng"}
            aria-pressed=${muted}
            data-f8-player-control="mute"
            @click=${this.handleMuteClick}
          >
            ${muted ? "🔇" : "🔊"}
          </button>
          <input
            class="f8p-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            .value=${String(volume)}
            role="slider"
            aria-label="Âm lượng"
            aria-valuenow=${volume}
            aria-valuemin="0"
            aria-valuemax="1"
            data-f8-player-control="volume"
            @input=${this.handleVolumeInput}
          />
        </div>

        ${this.renderPipButton(state)}

        <button
          type="button"
          class="f8p-btn"
          aria-label=${fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          aria-pressed=${fullscreen}
          data-f8-player-control="fullscreen"
          @click=${this.handleFullscreenClick}
        >
          ⛶
        </button>
      </div>
    `;
  }

  private renderQualityControl(state: PlayerState | null): unknown {
    const qualities = state?.qualities ?? [];
    if (qualities.length === 0) return null;

    return html`
      <select
        class="f8p-select"
        .value=${state?.activeQuality?.id ?? "auto"}
        aria-label="Chất lượng video"
        data-f8-player-control="quality"
        @change=${this.handleQualityChange}
      >
        <option value="auto">Tự động</option>
        ${qualities.map((quality) => html`<option value=${quality.id}>${quality.label}</option>`)}
      </select>
    `;
  }

  private renderPlaybackRateControl(state: PlayerState | null): unknown {
    const playbackRate = state?.playbackRate ?? 1;
    const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    return html`
      <select
        class="f8p-select"
        .value=${String(playbackRate)}
        aria-label="Tốc độ phát"
        data-f8-player-control="playback-rate"
        @change=${this.handlePlaybackRateChange}
      >
        ${rates.map((rate) => html`<option value=${rate}>${rate === 1 ? "Bình thường" : `${rate}×`}</option>`)}
      </select>
    `;
  }

  private renderPipButton(state: PlayerState | null): unknown {
    if (typeof document !== "undefined" && !document.pictureInPictureEnabled) return null;
    const pip = state?.pip ?? false;
    return html`
      <button
        type="button"
        class="f8p-btn"
        aria-label=${pip ? "Thoát chế độ hình trong hình" : "Hình trong hình"}
        aria-pressed=${pip}
        data-f8-player-control="pip"
        @click=${this.handlePipClick}
      >
        ⧉
      </button>
    `;
  }

  private handlePlayPauseClick(): void {
    const player = this.controller.player;
    if (!player) return;
    if (player.getState().status === "playing") {
      player.pause();
      return;
    }
    player.play().catch(() => {
      /* surfaced through the core error event */
    });
  }

  private handleSeekInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    this.controller.player?.seekTo(Number(input.value));
  }

  private handleMuteClick(): void {
    const player = this.controller.player;
    if (!player) return;
    player.setMuted(!player.getState().muted);
  }

  private handleVolumeInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    this.controller.player?.setVolume(Number(input.value));
  }

  private handleQualityChange(event: Event): void {
    const player = this.controller.player;
    if (!player) return;
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "auto") {
      player.commands.run("hls-quality:setAuto");
      return;
    }
    const quality = player.getState().qualities.find((item) => item.id === value);
    if (quality) player.commands.run("hls-quality:set", quality as unknown as Record<string, unknown>);
  }

  private handlePlaybackRateChange(event: Event): void {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    this.controller.player?.setPlaybackRate(value);
  }

  private handlePipClick(): void {
    this.controller.player?.commands.run("pip:toggle");
  }

  private handleFullscreenClick(): void {
    this.controller.player?.commands.run("fullscreen:toggle");
  }

  private formatTimeLabel(seconds: number): string {
    if (!Number.isFinite(seconds)) return "Trực tiếp";
    return formatTime(Math.max(0, seconds));
  }

  private toDateTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return "PT0S";
    return `PT${Math.round(Math.max(0, seconds))}S`;
  }

  // ------------------------------------------------------------------------
  // Internal — re-emit every core event as a CustomEvent("f8-player:<name>")
  // ------------------------------------------------------------------------

  private installEventBridges(): void {
    if (this.bridgesInstalled) return;
    const events: ReadonlyArray<keyof PlayerEvents> = [
      "ready",
      "play",
      "pause",
      "ended",
      "timeupdate",
      "durationchange",
      "ratechange",
      "volumechange",
      "seeking",
      "seeked",
      "buffering",
      "qualitychange",
      "error",
      "unauthorized",
      "fullscreenchange",
      "pipchange",
    ];
    for (const event of events) {
      this.controller.on(event, (payload) => {
        this.dispatchEvent(
          new CustomEvent(`f8-player:${event}`, {
            detail: payload,
            bubbles: true,
            composed: true,
          }),
        );
      });
    }
    this.bridgesInstalled = true;
  }
}

/**
 * Idempotently register `<f8-player>` on `window.customElements`. Opt-in so
 * apps that ship the package twice don't crash on `customElements.define`.
 *
 * Returns the element constructor for convenience.
 */
export function defineF8Player(): typeof F8PlayerElement {
  if (typeof customElements !== "undefined") {
    const existing = customElements.get("f8-player");
    if (!existing) customElements.define("f8-player", F8PlayerElement);
  }
  return F8PlayerElement;
}

declare global {
  interface HTMLElementTagNameMap {
    "f8-player": F8PlayerElement;
  }
}

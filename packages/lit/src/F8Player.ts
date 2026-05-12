import { formatTime } from "@f8/player-core";
import type { Player, PlayerEvents, PlayerOptions, PlayerState } from "@f8/player-core";
import { LitElement, html, css } from "lit";

import { PlayerController } from "./PlayerController.js";

const ICONS = {
  play: {
    viewBox: "0 0 512 512",
    path: "M489.031 215.047L201.031 39.047C193.365 34.367 184.697 32.016 176.012 32.016C148.396 32.016 128 54.619 128 80V432C128 457.607 148.615 480 176 480C184.688 480 193.359 477.641 201.031 472.953L489.031 296.953C503.297 288.234 512 272.719 512 256S503.297 223.766 489.031 215.047ZM176 432L175.816 80.025L176.012 80.016L176.002 80.004L464.002 255.996L176 432Z",
  },
  pause: {
    viewBox: "0 0 320 512",
    path: "M56 64C42.75 64 32 74.75 32 88V424C32 437.25 42.75 448 56 448S80 437.25 80 424V88C80 74.75 69.25 64 56 64ZM264 64C250.75 64 240 74.75 240 88V424C240 437.25 250.75 448 264 448S288 437.25 288 424V88C288 74.75 277.25 64 264 64Z",
  },
  rewind: {
    viewBox: "0 0 512 512",
    path: "M30.812 49.812C39.781 46.156 50.094 48.156 56.969 55.031L98.965 97.027C140.033 56.652 195.969 32 256 32C379.5 32 480 132.5 480 256S379.5 480 256 480C203.688 480 152.781 461.562 112.625 428.125C102.437 419.625 101.062 404.5 109.562 394.312C118.094 384.094 133.187 382.75 143.375 391.25C174.906 417.531 214.906 432 256 432C353.031 432 432 353.031 432 256S353.031 80 256 80C208.924 80 165.074 99.289 132.824 130.887L184.969 183.031C191.844 189.906 193.875 200.219 190.187 209.188C186.469 218.156 177.719 224 168 224H40C26.75 224 16 213.25 16 200V72C16 62.281 21.844 53.531 30.812 49.812Z",
  },
  forward: {
    viewBox: "0 0 512 512",
    path: "M481.25 33.812C472.312 30.156 461.938 32.156 455.094 39.031L404.588 89.539C364.408 53.812 312.152 32 256.062 32C157.062 32 68.594 98.312 40.969 193.281C37.25 206.031 44.562 219.344 57.281 223.031C70.094 226.813 83.344 219.406 87.031 206.719C108.75 132.094 178.281 80 256.062 80C299.182 80 339.416 96.418 370.725 123.398L311.094 183.031C304.219 189.906 302.187 200.219 305.875 209.188C309.594 218.156 318.344 224 328.062 224H472.062C485.312 224 496.062 213.25 496.062 200V56C496.062 46.281 490.219 37.531 481.25 33.812ZM454.781 288.969C442 285.219 428.719 292.562 425.031 305.281C403.312 379.906 333.781 432 256 432C212.877 432 172.648 415.578 141.348 388.59L200.969 328.969C207.844 322.094 209.875 311.781 206.188 302.812C202.469 293.844 193.719 288 184 288H40C26.75 288 16 298.75 16 312V456C16 465.719 21.844 474.469 30.812 478.188C33.781 479.406 36.906 480 40 480C46.25 480 52.375 477.562 56.969 472.969L107.482 422.453C147.654 458.184 199.904 480 256 480C355 480 443.469 413.688 471.094 318.719C474.812 305.969 467.5 292.656 454.781 288.969Z",
  },
  volume: {
    viewBox: "0 0 640 512",
    path: "M301.109 35.053C296.908 33.16 292.445 32.238 288.014 32.238C280.316 32.238 272.715 35.02 266.734 40.328L131.84 160.096H48C21.49 160.096 0 181.562 0 208.039V303.928C0 330.404 21.49 351.871 48 351.871H131.84L266.734 471.639C272.719 476.945 280.312 479.723 288 479.723C292.438 479.723 296.906 478.818 301.109 476.914C312.609 471.764 320 460.34 320 447.76V64.207C320 51.627 312.609 40.203 301.109 35.053ZM272 412.125L150.074 303.871L48 303.928V208.096H150.074L272 99.842V412.125ZM412.562 182.008C408.094 178.385 402.707 176.613 397.361 176.613C390.41 176.613 383.529 179.605 378.812 185.41C370.406 195.648 371.906 210.756 382.188 219.152C393.5 228.391 400 241.812 400 255.984C400 270.154 393.5 283.576 382.188 292.816C371.906 301.213 370.406 316.32 378.812 326.559C383.531 332.363 390.437 335.359 397.375 335.359C402.719 335.359 408.125 333.58 412.562 329.961C435.094 311.545 448 284.607 448 255.984S435.094 200.424 412.562 182.008ZM473.125 108.156C468.67 104.523 463.283 102.746 457.924 102.746C450.99 102.746 444.104 105.721 439.344 111.496C430.938 121.734 432.438 136.842 442.688 145.238C476.562 172.986 496 213.346 496 255.984C496 298.621 476.562 338.98 442.688 366.73C432.438 375.127 430.938 390.234 439.344 400.473C444.094 406.246 450.969 409.242 457.906 409.242C463.281 409.242 468.656 407.463 473.125 403.813C518.156 366.949 544 313.043 544 255.984S518.156 145.02 473.125 108.156ZM534.375 33.398C529.926 29.77 524.547 28 519.193 28C512.252 28 505.357 30.977 500.594 36.738C492.188 46.977 493.688 62.084 503.938 70.48C559.906 116.271 592 183.881 592 255.984S559.906 395.695 503.938 441.486C493.688 449.883 492.188 464.99 500.594 475.229C505.344 481.004 512.219 484 519.156 484C524.531 484 529.906 482.221 534.375 478.568C601.5 423.633 640 342.508 640 255.984C640 169.459 601.5 88.336 534.375 33.398Z",
  },
  volumeMuted: {
    viewBox: "0 0 576 512",
    path: "M301.109 34.818C296.908 32.922 292.445 31.998 288.014 31.998C280.316 31.998 272.715 34.783 266.734 40.1L131.84 160.004H48C21.49 160.004 0 181.496 0 208.004V304.002C0 330.51 21.49 352.002 48 352.002H131.84L266.734 471.906C272.719 477.219 280.312 480 288 480C292.438 480 296.906 479.094 301.109 477.188C312.609 472.031 320 460.594 320 448V64.006C320 51.412 312.609 39.975 301.109 34.818ZM272 412.365L150.09 304.002H48V208.004H150.09L272 99.641V412.365ZM513.938 256L560.969 208.969C570.344 199.594 570.344 184.406 560.969 175.031S536.406 165.656 527.031 175.031L480 222.062L432.969 175.031C423.594 165.656 408.406 165.656 399.031 175.031S389.656 199.594 399.031 208.969L446.062 256L399.031 303.031C389.656 312.406 389.656 327.594 399.031 336.969C408.404 346.342 423.588 346.35 432.969 336.969L480 289.938L527.031 336.969C536.404 346.342 551.588 346.35 560.969 336.969C570.344 327.594 570.344 312.406 560.969 303.031L513.938 256Z",
  },
  maximize: {
    viewBox: "0 0 448 512",
    path: "M428.25 290.438C416.281 285.469 402.531 288.219 393.375 297.375L346.344 344.41L257.939 256L346.344 167.594L393.373 214.625C399.5 220.742 407.67 223.977 416.002 223.977C420.119 223.977 424.277 223.18 428.246 221.562C440.215 216.609 447.996 204.938 447.996 192V56C447.996 42.75 437.252 32 423.996 32H287.998C275.061 32 263.373 39.797 258.436 51.75C253.467 63.719 256.217 77.469 265.373 86.625L312.406 133.656L224.002 222.062L135.594 133.652L182.625 86.625C188.742 80.496 191.977 72.328 191.977 63.992C191.977 59.875 191.18 55.719 189.562 51.75C184.609 39.781 172.938 32 160 32H24C10.75 32 0 42.742 0 56V192C0 204.938 7.797 216.625 19.75 221.562C31.719 226.531 45.469 223.781 54.625 214.625L101.656 167.59L190.064 256L101.656 344.406L54.627 297.375C48.5 291.258 40.33 288.023 31.998 288.023C27.881 288.023 23.723 288.82 19.754 290.438C7.785 295.391 0.004 307.062 0.004 320V456C0.004 469.25 10.748 480 24.004 480H160.002C172.939 480 184.627 472.203 189.564 460.25C194.533 448.281 191.783 434.531 182.627 425.375L135.594 378.344L224.002 289.937L312.406 378.348L265.375 425.375C259.258 431.504 256.023 439.672 256.023 448.008C256.023 452.125 256.82 456.281 258.438 460.25C263.391 472.219 275.062 480 288 480H424C437.25 480 448 469.258 448 456V320C448 307.062 440.203 295.375 428.25 290.438Z",
  },
  pip: {
    viewBox: "0 0 576 512",
    path: "M502.5 32H73.5C32.969 32 0 65.188 0 106V168C0 181.25 10.75 192 24 192S48 181.25 48 168V106C48 91.656 59.438 80 73.5 80H502.5C516.562 80 528 91.656 528 106V406C528 420.344 516.562 432 502.5 432H312C298.75 432 288 442.75 288 456S298.75 480 312 480H502.5C543.031 480 576 446.812 576 406V106C576 65.188 543.031 32 502.5 32ZM32 416C14.326 416 0 430.328 0 448S14.326 480 32 480S64 465.672 64 448S49.674 416 32 416ZM24 320C10.75 320 0 330.75 0 344S10.75 368 24 368C72.531 368 112 407.469 112 456C112 469.25 122.75 480 136 480S160 469.25 160 456C160 381 99 320 24 320ZM24 224C10.75 224 0 234.75 0 248S10.75 272 24 272C125.469 272 208 354.531 208 456C208 469.25 218.75 480 232 480S256 469.25 256 456C256 328.062 151.938 224 24 224Z",
  },
} as const;

type IconName = keyof typeof ICONS;

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
    const seekValue = Math.min(Math.max(currentTime, 0), max);
    const playedPct = max > 0 ? Math.min(100, (seekValue / max) * 100) : 0;
    const bufferedEnd = (state?.buffered ?? []).reduce((acc, range) => Math.max(acc, range.end), 0);
    const bufferedPct = max > 0 ? Math.min(100, (bufferedEnd / max) * 100) : 0;
    const isPlaying = state?.status === "playing";
    const muted = state?.muted ?? false;
    const volume = state?.volume ?? 1;
    const fullscreen = state?.fullscreen ?? false;

    return html`
      <div
        class="f8p-controls"
        role="toolbar"
        aria-label="Điều khiển video"
        data-f8-player-controls
      >
        <time
          class="f8p-time"
          aria-label=${`Vị trí hiện tại: ${this.formatTimeLabel(currentTime)}`}
          datetime=${this.toDateTime(currentTime)}
          data-f8-player-control="time"
          data-variant="current"
        >
          ${this.formatTimeLabel(currentTime)}
        </time>

        <div
          class="f8p-seek"
          data-f8p-seek-wrapper
          style=${`--f8p-seek-progress: ${playedPct}%`}
        >
          <div
            data-f8p-seek-buffered
            style=${`width: ${bufferedPct}%`}
            aria-hidden="true"
          ></div>
          <input
            type="range"
            min="0"
            max=${max}
            step="0.1"
            .value=${String(seekValue)}
            role="slider"
            aria-label="Vị trí phát"
            aria-valuenow=${seekValue}
            aria-valuemin="0"
            aria-valuemax=${max}
            data-f8-player-control="seek-bar"
            @input=${this.handleSeekInput}
          />
        </div>

        <time
          class="f8p-time"
          aria-label=${`Thời lượng: ${this.formatTimeLabel(duration)}`}
          datetime=${this.toDateTime(duration)}
          data-f8-player-control="time"
          data-variant="duration"
        >
          ${this.formatTimeLabel(duration)}
        </time>

        <button
          type="button"
          class="f8p-btn"
          aria-label="Tua lại 10 giây"
          data-f8-player-control="seek-backward"
          data-seek-offset="-10"
          @click=${this.handleSeekBackwardClick}
        >
          ${this.renderIcon("rewind")}
        </button>

        <button
          type="button"
          class="f8p-btn"
          aria-label=${isPlaying ? "Tạm dừng" : "Phát"}
          aria-pressed=${isPlaying}
          data-f8-player-control="play-pause"
          @click=${this.handlePlayPauseClick}
        >
          ${this.renderIcon(isPlaying ? "pause" : "play")}
        </button>

        <button
          type="button"
          class="f8p-btn"
          aria-label="Tua tới 10 giây"
          data-f8-player-control="seek-forward"
          data-seek-offset="10"
          @click=${this.handleSeekForwardClick}
        >
          ${this.renderIcon("forward")}
        </button>

        ${this.renderQualityControl(state)} ${this.renderPlaybackRateControl(state)}

        <div class="f8p-volume">
          <button
            type="button"
            class="f8p-btn"
            aria-label=${muted ? "Bật tiếng" : "Tắt tiếng"}
            aria-pressed=${muted}
            data-f8-player-control="mute"
            @click=${this.handleMuteClick}
          >
            ${this.renderIcon(muted || volume <= 0 ? "volumeMuted" : "volume")}
          </button>
          <input
            class="f8p-volume-slider"
            style=${`--f8p-volume-progress: ${Math.min(Math.max(volume, 0), 1) * 100}%`}
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
          ${this.renderIcon("maximize")}
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
        ${qualities.map(
          (quality) => html`<option value=${quality.id}>${this.formatQualityLabel(quality.label)}</option>`,
        )}
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
        ${rates.map(
          (rate) => html`<option value=${rate}>${rate === 1 ? "Bình thường" : `${rate}×`}</option>`,
        )}
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
        ${this.renderIcon("pip")}
      </button>
    `;
  }

  private renderIcon(name: IconName): unknown {
    const icon = ICONS[name];

    return html`
      <svg
        aria-hidden="true"
        data-f8-player-icon=${name}
        focusable="false"
        viewBox=${icon.viewBox}
      >
        <path d=${icon.path}></path>
      </svg>
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

  private handleSeekBackwardClick(): void {
    this.seekBy(-10);
  }

  private handleSeekForwardClick(): void {
    this.seekBy(10);
  }

  private seekBy(offset: number): void {
    const player = this.controller.player;
    if (!player) return;
    const { currentTime, duration } = player.getState();
    const next = Math.max(0, currentTime + offset);
    player.seekTo(Number.isFinite(duration) && duration > 0 ? Math.min(duration, next) : next);
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
    if (quality)
      player.commands.run("hls-quality:set", quality as unknown as Record<string, unknown>);
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

  private formatQualityLabel(label: string): string {
    const match = label.match(/^(\d+)p$/i);
    return match ? `${match[1]} HD` : label;
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

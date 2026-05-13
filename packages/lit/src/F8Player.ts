import { detectSourceType, formatTime } from "@f8/player-core";
import type {
  Disposer,
  Player,
  PlayerEvents,
  PlayerOptions,
  PlayerState,
  QualityLevel,
} from "@f8/player-core";
import { LitElement, html, css } from "lit";

import { PlayerController } from "./PlayerController.js";

/**
 * Shape of one parsed sprite-thumbnail cue — structurally compatible with
 * `@f8/player-plugin-thumbnails`'s `ThumbnailCue` without taking a hard
 * dependency on the plugin package.
 */
interface ThumbnailCueLite {
  start: number;
  end: number;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Shape emitted by `@f8/player-plugin-subtitles` on `subtitles:changed`. */
interface SubtitleTrackStateLite {
  lang: string;
  label: string;
  mode: "showing" | "hidden" | "disabled";
}

/** Persisted user preferences stored in localStorage. */
interface PlayerPrefs {
  volume: number;
  muted: boolean;
  playbackRate: number;
  /** Quality resolution in pixels (e.g. 720, 1080). null = auto. */
  qualityHeight: number | null;
  /** Active captions language code. null = off. */
  captionsLang: string | null;
}

const THUMB_PREVIEW_WIDTH = 160;
const THUMB_PREVIEW_HEIGHT = 90;

function findCueAt(cues: readonly ThumbnailCueLite[], time: number): ThumbnailCueLite | null {
  if (!cues.length || !Number.isFinite(time)) return null;
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (!cue) return null;
    if (time < cue.start) {
      hi = mid - 1;
    } else if (time >= cue.end) {
      lo = mid + 1;
    } else {
      return cue;
    }
  }
  return null;
}

const ICONS = {
  play: {
    viewBox: "0 0 512 512",
    path: "M176 480C148.615 480 128 457.608 128 432V80C128 54.62 148.396 32.017 176.012 32.017C184.698 32.017 193.366 34.368 201.031 39.047L489.031 215.047C503.297 223.766 512 239.281 512 256S503.297 288.234 489.031 296.953L201.031 472.953C193.359 477.641 184.688 480 176 480Z",
  },
  pause: {
    viewBox: "0 0 320 512",
    path: "M272 64H240C213.49 64 192 85.49 192 112V400C192 426.51 213.49 448 240 448H272C298.51 448 320 426.51 320 400V112C320 85.49 298.51 64 272 64ZM80 64H48C21.49 64 0 85.49 0 112V400C0 426.51 21.49 448 48 448H80C106.51 448 128 426.51 128 400V112C128 85.49 106.51 64 80 64Z",
  },
  rewind: {
    viewBox: "0 0 512 512",
    path: "M30.812 49.812C39.781 46.156 50.094 48.156 56.969 55.031L98.965 97.027C140.033 56.652 195.969 32 256 32C379.5 32 480 132.5 480 256S379.5 480 256 480C203.688 480 152.781 461.562 112.625 428.125C102.437 419.625 101.062 404.5 109.562 394.312C118.094 384.094 133.187 382.75 143.375 391.25C174.906 417.531 214.906 432 256 432C353.031 432 432 353.031 432 256S353.031 80 256 80C208.924 80 165.074 99.289 132.824 130.887L184.969 183.031C191.844 189.906 193.875 200.219 190.187 209.188C186.469 218.156 177.719 224 168 224H40C26.75 224 16 213.25 16 200V72C16 62.281 21.844 53.531 30.812 49.812Z",
  },
  forward: {
    viewBox: "0 0 512 512",
    path: "M496 72V200C496 213.25 485.25 224 472 224H344C334.281 224 325.531 218.156 321.812 209.188C318.125 200.219 320.156 189.906 327.031 183.031L379.176 130.887C346.926 99.289 303.076 80 256 80C158.969 80 80 158.969 80 256S158.969 432 256 432C297.094 432 337.094 417.531 368.625 391.25C378.812 382.75 393.906 384.094 402.437 394.312C410.937 404.5 409.562 419.625 399.375 428.125C359.219 461.562 308.312 480 256 480C132.5 480 32 379.5 32 256S132.5 32 256 32C316.031 32 371.967 56.652 413.035 97.027L455.031 55.031C461.906 48.156 472.219 46.156 481.187 49.813C490.156 53.531 496 62.281 496 72Z",
  },
  volume: {
    viewBox: "0 0 576 512",
    path: "M444.562 181.942C434.281 173.598 419.156 175.067 410.812 185.348C402.406 195.598 403.906 210.723 414.188 219.129C425.5 228.379 432 241.816 432 256.003C432 270.19 425.5 283.628 414.188 292.878C403.906 301.284 402.406 316.409 410.812 326.658C415.531 332.471 422.437 335.471 429.375 335.471C434.719 335.471 440.125 333.69 444.562 330.065C467.094 311.627 480 284.659 480 256.003S467.094 200.379 444.562 181.942ZM505.125 108.005C494.906 99.662 479.781 101.099 471.344 111.349C462.937 121.599 464.437 136.724 474.687 145.13C508.562 172.911 528 213.316 528 256.003S508.562 339.096 474.688 366.877C464.438 375.283 462.938 390.408 471.344 400.657C476.094 406.439 482.969 409.439 489.906 409.439C495.281 409.439 500.656 407.657 505.125 404.001C550.156 367.095 576 313.127 576 256.003S550.156 144.911 505.125 108.005ZM333.109 34.819C321.609 29.631 308.156 31.725 298.734 40.1L163.84 160.005H80C53.49 160.005 32 181.496 32 208.004V304.002C32 330.51 53.49 352.002 80 352.002H163.84L298.734 471.906C304.719 477.219 312.312 480 320 480C324.438 480 328.906 479.094 333.109 477.188C344.609 472.031 352 460.594 352 448V64.006C352 51.412 344.609 39.975 333.109 34.819Z",
  },
  volumeMuted: {
    viewBox: "0 0 576 512",
    path: "M301.109 34.818C289.609 29.631 276.156 31.725 266.734 40.1L131.84 160.004H48C21.49 160.004 0 181.496 0 208.004V304.002C0 330.51 21.49 352.002 48 352.002H131.84L266.734 471.906C272.719 477.219 280.312 480 288 480C292.438 480 296.906 479.094 301.109 477.188C312.609 472.031 320 460.594 320 448V64.006C320 51.412 312.609 39.975 301.109 34.818ZM513.938 255.998L560.969 208.967C570.344 199.592 570.344 184.404 560.969 175.029S536.406 165.654 527.031 175.029L480 222.061L432.969 175.029C423.594 165.654 408.406 165.654 399.031 175.029S389.656 199.592 399.031 208.967L446.062 255.998L399.031 303.029C389.656 312.404 389.656 327.592 399.031 336.967C408.404 346.34 423.588 346.348 432.969 336.967L480 289.936L527.031 336.967C536.404 346.34 551.588 346.348 560.969 336.967C570.344 327.592 570.344 312.404 560.969 303.029L513.938 255.998Z",
  },
  maximize: {
    viewBox: "0 0 448 512",
    path: "M136 32H24C10.746 32 0 42.746 0 56V168C0 181.254 10.746 192 24 192C37.258 192 48 181.254 48 168V80H136C149.258 80 160 69.254 160 56S149.258 32 136 32ZM424 32H312C298.746 32 288 42.746 288 56C288 69.258 298.746 80 312 80H400V168C400 181.258 410.746 192 424 192S448 181.258 448 168V56C448 42.746 437.254 32 424 32ZM136 432H48V344C48 330.742 37.254 320 24 320S0 330.742 0 344V456C0 469.254 10.746 480 24 480H136C149.254 480 160 469.254 160 456C160 442.742 149.254 432 136 432ZM424 320C410.742 320 400 330.746 400 344V432H312C298.742 432 288 442.746 288 456S298.742 480 312 480H424C437.254 480 448 469.254 448 456V344C448 330.746 437.254 320 424 320Z",
  },
  minimize: {
    viewBox: "0 0 448 512",
    path: "M136 320H24C10.746 320 0 330.742 0 344C0 357.254 10.746 368 24 368H112V456C112 469.254 122.746 480 136 480S160 469.254 160 456V344C160 330.742 149.254 320 136 320ZM312 192H424C437.254 192 448 181.254 448 168C448 154.742 437.254 144 424 144H336V56C336 42.742 325.254 32 312 32S288 42.742 288 56V168C288 181.254 298.746 192 312 192ZM136 32C122.746 32 112 42.742 112 56V144H24C10.746 144 0 154.742 0 168C0 181.254 10.746 192 24 192H136C149.254 192 160 181.254 160 168V56C160 42.742 149.254 32 136 32ZM424 320H312C298.746 320 288 330.742 288 344V456C288 469.254 298.746 480 312 480S336 469.254 336 456V368H424C437.254 368 448 357.254 448 344C448 330.742 437.254 320 424 320Z",
  },
  compress: {
    viewBox: "0 0 448 512",
    path: "M128 320H32C14.312 320 0 334.312 0 352S14.312 384 32 384H96V448C96 465.688 110.312 480 128 480S160 465.688 160 448V352C160 334.312 145.688 320 128 320ZM416 320H320C302.312 320 288 334.312 288 352V448C288 465.688 302.312 480 320 480S352 465.688 352 448V384H416C433.688 384 448 369.688 448 352S433.688 320 416 320ZM320 192H416C433.688 192 448 177.688 448 160S433.688 128 416 128H352V64C352 46.312 337.688 32 320 32S288 46.312 288 64V160C288 177.688 302.312 192 320 192ZM128 32C110.312 32 96 46.312 96 64V128H32C14.312 128 0 142.312 0 160S14.312 192 32 192H128C145.688 192 160 177.688 160 160V64C160 46.312 145.688 32 128 32Z",
  },
  settings: {
    viewBox: "0 0 512 512",
    path: "M499.954 332.005C499.954 326.345 496.842 320.874 491.75 317.934L445.137 291.023C447.235 279.648 448.477 267.977 448.477 256S447.235 232.352 445.137 220.977L491.75 194.066C496.842 191.126 499.954 185.655 499.954 179.995C499.954 165.898 457.979 80.953 436.09 80.953C433.258 80.953 430.403 81.68 427.844 83.156L381.125 110.133C363.411 94.98 342.897 83.098 320.477 75.16V21.281C320.477 13.758 315.315 7.004 307.95 5.461C291.321 1.977 274.145 0 256.477 0S221.633 1.977 205.004 5.461C197.639 7.004 192.477 13.758 192.477 21.281V75.16C170.057 83.098 149.543 94.98 131.828 110.133L85.11 83.156C82.553 81.68 79.694 80.953 76.864 80.953C57.143 80.953 13 162.9 13 179.995C13 185.655 16.112 191.126 21.203 194.066L67.817 220.977C65.719 232.352 64.477 244.023 64.477 256S65.719 279.648 67.817 291.023L21.203 317.934C16.112 320.874 13 326.345 13 332.005C13 346.102 54.975 431.047 76.864 431.047C79.696 431.047 82.551 430.32 85.11 428.844L131.828 401.867C149.543 417.02 170.057 428.902 192.477 436.84V490.719C192.477 498.242 197.639 504.996 205.004 506.539C221.633 510.023 238.809 512 256.477 512S291.321 510.023 307.95 506.539C315.315 504.996 320.477 498.242 320.477 490.719V436.84C342.897 428.902 363.411 417.02 381.125 401.867L427.844 428.844C430.401 430.32 433.26 431.047 436.09 431.047C455.81 431.047 499.954 349.1 499.954 332.005ZM256.477 336C212.366 336 176.477 300.113 176.477 256S212.366 176 256.477 176S336.477 211.887 336.477 256S300.588 336 256.477 336Z",
  },
  pip: {
    viewBox: "0 0 576 512",
    path: "M502.5 32H73.5C32.969 32 0 65.188 0 106V168C0 181.25 10.75 192 24 192S48 181.25 48 168V106C48 91.656 59.438 80 73.5 80H502.5C516.562 80 528 91.656 528 106V406C528 420.344 516.562 432 502.5 432H312C298.75 432 288 442.75 288 456S298.75 480 312 480H502.5C543.031 480 576 446.812 576 406V106C576 65.188 543.031 32 502.5 32ZM32 416C14.326 416 0 430.328 0 448S14.326 480 32 480S64 465.672 64 448S49.674 416 32 416ZM24 320C10.75 320 0 330.75 0 344S10.75 368 24 368C72.531 368 112 407.469 112 456C112 469.25 122.75 480 136 480S160 469.25 160 456C160 381 99 320 24 320ZM24 224C10.75 224 0 234.75 0 248S10.75 272 24 272C125.469 272 208 354.531 208 456C208 469.25 218.75 480 232 480S256 469.25 256 456C256 328.062 151.938 224 24 224Z",
  },
  cc: {
    viewBox: "0 0 512 512",
    path: "M464 64H48C21.49 64 0 85.49 0 112V400C0 426.51 21.49 448 48 448H464C490.51 448 512 426.51 512 400V112C512 85.49 490.51 64 464 64ZM214.83 320.06C220.31 322.74 226.43 322.42 231.62 319.18C236.78 315.95 240 310.27 240 304.06C240 295.22 247.16 288.06 256 288.06S272 295.22 272 304.06C272 322.5 262.46 339.34 246.49 349.34C230.5 359.34 210.61 360.45 193.59 352.16C167.91 339.66 152 313.71 152 285.4V226.7C152 198.39 167.91 172.44 193.59 159.94C210.59 151.66 230.51 152.74 246.49 162.76C262.45 172.78 272 189.62 272 208.05C272 216.89 264.84 224.05 256 224.05S240 216.89 240 208.05C240 201.85 236.78 196.16 231.62 192.92C226.45 189.69 220.31 189.36 214.83 192.04C202.55 198.04 195 209.95 195 226.69V285.39C195 302.14 202.55 314.05 214.83 320.06ZM374.83 320.06C380.3 322.74 386.42 322.42 391.61 319.18C396.78 315.95 400 310.26 400 304.06C400 295.22 407.16 288.06 416 288.06S432 295.22 432 304.06C432 322.5 422.45 339.34 406.49 349.36C390.5 359.36 370.62 360.46 353.59 352.18C327.91 339.68 312 313.73 312 285.42V226.7C312 198.39 327.91 172.44 353.59 159.94C370.59 151.66 390.51 152.74 406.49 162.76C422.45 172.78 432 189.62 432 208.05C432 216.89 424.84 224.05 416 224.05S400 216.89 400 208.05C400 201.85 396.78 196.16 391.61 192.92C386.45 189.69 380.31 189.36 374.83 192.04C362.55 198.04 355 209.95 355 226.69V285.39C355 302.14 362.55 314.05 374.83 320.06Z",
  },
} as const;

type IconName = keyof typeof ICONS;
type ControlMenuId = "captions" | "quality" | "speed";

interface ControlMenuOption {
  value: string;
  label: string;
  badge?: string | null;
  active: boolean;
  onSelect: () => void;
}

interface ThumbnailHoverState {
  x: number;
  time: number;
  hostWidth: number;
  wrapperLeft: number;
}

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

  /**
   * Custom list of playback rates shown in the speed menu.
   * Defaults to `[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]` when `null`.
   */
  playbackRates: readonly number[] | null = null;

  /**
   * Persist volume, speed, quality, and captions to `localStorage` and
   * restore them on next load (YouTube-style adaptive quality preference).
   */
  persistPrefs = false;

  /**
   * `localStorage` key used when `persistPrefs` is enabled.
   * Override this to isolate prefs when embedding multiple players on one page.
   */
  prefsKey = "f8-player:prefs";

  /** Reactive controller — owns the player lifecycle. */
  readonly controller = new PlayerController(this, () => this.options);

  /** The `<video>` element after `firstUpdated`. */
  private videoEl: HTMLVideoElement | null = null;

  /** Time captured on the most recent `pause()`, used by `restore()`. */
  private lastPausedTime = 0;

  /** Forward declaration for typed re-emission setup. */
  private bridgesInstalled = false;

  /**
   * Sprite-thumbnail cues populated by `@f8/player-plugin-thumbnails` events
   * (`thumbnails:ready` / `thumbnails:cleared`). Empty when the plugin
   * isn't loaded — in which case the hover preview never renders.
   */
  private thumbnailCues: readonly ThumbnailCueLite[] = [];

  /** Hover pointer state tracked on the timeline wrapper. */
  private thumbnailHover: ThumbnailHoverState | null = null;

  /** Active caption language (null = off). Mirrored from `subtitles:changed`. */
  private activeCaptionsLang: string | null = null;

  /** Center spinner until hls.js finishes a user-triggered rendition change. */
  private qualitySwitchOverlay = false;

  /** Whether the user opened the captions `<select>` overlay at least once. */
  private captionsTouched = false;

  /** Disposers returned by `controller.on(...)` for plugin-event subscriptions. */
  private pluginEventDisposers: Disposer[] = [];

  /**
   * Persist-guard: ignore volume/rate change events briefly after restoring from LS.
   * The engine sometimes emits stale values (e.g. playbackRate 1 right after restoring 1.6).
   */
  private playbackPrefsAllowSave = false;
  private playbackPrefsRestoreOnPlay = true;
  private playbackPrefsUnlockGen = 0;
  /** Playback rate restored from LS; used to ignore spurious `ratechange→1` right after. */
  private playbackPrefsLastLsPlaybackRate: number | null = null;
  private playbackPrefsLastLsRateAppliedAt = 0;

  private schedulePlaybackPrefsSaveUnlock(): void {
    this.playbackPrefsAllowSave = false;
    const gen = ++this.playbackPrefsUnlockGen;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (gen !== this.playbackPrefsUnlockGen) return;
        if (!this.persistPrefs || !this.controller.player) return;
        this.playbackPrefsAllowSave = true;
      });
    });
  }

  private openMenu: ControlMenuId | null = null;

  /** Re-render when native `<track>` elements are added/removed or their mode changes. */
  private readonly _onTextTrackChange = (): void => {
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.requestUpdate();
    });
  };

  /**
   * `mousedown.preventDefault()` on listbox items: avoids browsers eating the
   * subsequent `click` when focus/track-mode churn retriggers renders mid-gesture.
   */
  private readonly handleMenuOptionMouseDown = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly onHostMouseLeave = (): void => {
    const ae = document.activeElement;
    if (ae instanceof HTMLElement && this.contains(ae)) {
      ae.blur();
    }
    this.closeOpenMenu();
  };

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.openMenu) return;
    const target = event.target;
    if (!(target instanceof Node)) {
      this.closeOpenMenu();
      return;
    }
    const activeMenu = this.querySelector<HTMLElement>(
      `[data-f8p-control-menu="${this.openMenu}"]`,
    );
    const contained = !!activeMenu?.contains(target);
    if (contained) return;
    // Defer closing so capture-phase pointerdown finishes its path; otherwise the
    // same gesture targeting another control can lose its click activation.
    const closingMenu = this.openMenu;
    queueMicrotask(() => {
      if (!closingMenu || this.openMenu !== closingMenu) return;
      this.closeOpenMenu();
    });
  };

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.closeOpenMenu();
  };

  static override properties = {
    options: { attribute: false },
    videoClass: { attribute: "video-class" },
    controls: { type: Boolean, reflect: true },
    theme: { type: String },
    playbackRates: { attribute: false },
    persistPrefs: { type: Boolean, attribute: "persist-prefs" },
    prefsKey: { attribute: "prefs-key" },
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("mouseleave", this.onHostMouseLeave);
    document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
    document.addEventListener("keydown", this.onDocumentKeydown);
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
    this.installPluginEventBridges();
    this.installPrefsListeners();
    // Listen for native <track> additions / mode changes so the CC button
    // stays in sync with tracks appended directly to <video> (e.g. by
    // captions-controller in f8-pro-ui). Guard: JSDOM stubs TextTrackList
    // without addEventListener, so skip in non-browser test environments.
    const tt = video.textTracks;
    if (typeof tt.addEventListener === "function") {
      tt.addEventListener("addtrack", this._onTextTrackChange);
      tt.addEventListener("removetrack", this._onTextTrackChange);
      tt.addEventListener("change", this._onTextTrackChange);
    }
  }

  override disconnectedCallback(): void {
    this.removeEventListener("mouseleave", this.onHostMouseLeave);
    document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    document.removeEventListener("keydown", this.onDocumentKeydown);
    super.disconnectedCallback();
    if (this.videoEl) {
      const tt = this.videoEl.textTracks;
      if (typeof tt.removeEventListener === "function") {
        tt.removeEventListener("addtrack", this._onTextTrackChange);
        tt.removeEventListener("removetrack", this._onTextTrackChange);
        tt.removeEventListener("change", this._onTextTrackChange);
      }
    }
    this.videoEl = null;
    this.qualitySwitchOverlay = false;
    this.bridgesInstalled = false;
    for (const d of this.pluginEventDisposers) d();
    this.pluginEventDisposers = [];
    this.thumbnailCues = [];
    this.thumbnailHover = null;
    this.openMenu = null;
  }

  /**
   * Subscribe to optional plugin events (`@f8/player-plugin-thumbnails`,
   * `@f8/player-plugin-subtitles`). If the plugins aren't loaded the core
   * bus simply never fires and the fields stay at their defaults.
   */
  private installPluginEventBridges(): void {
    type PluginEventName = "thumbnails:ready" | "thumbnails:cleared" | "subtitles:changed";
    // `controller.on` is a class method — bind to preserve `this` when we
    // cast the signature to accept plugin-level event names.
    const bound = this.controller.on.bind(this.controller);
    const onAny = bound as unknown as (
      event: PluginEventName,
      handler: (payload: unknown) => void,
    ) => Disposer;

    // One-time flag: restore saved captions pref on the first subtitles event.
    let captionsPrefRestored = false;

    this.pluginEventDisposers.push(
      onAny("thumbnails:ready", (payload) => {
        const next = (payload as { cues?: ThumbnailCueLite[] } | undefined)?.cues;
        if (!Array.isArray(next)) return;
        this.thumbnailCues = next;
        this.requestUpdate();
      }),
      onAny("thumbnails:cleared", () => {
        if (this.thumbnailCues.length === 0) return;
        this.thumbnailCues = [];
        this.thumbnailHover = null;
        this.requestUpdate();
      }),
      onAny("subtitles:changed", (payload) => {
        const states = payload as SubtitleTrackStateLite[] | undefined;
        if (!Array.isArray(states)) return;
        const showing = states.find((s) => s.mode === "showing");
        const next = showing?.lang ?? null;
        if (next !== this.activeCaptionsLang) {
          this.activeCaptionsLang = next;
          this.requestUpdate();
        }
        // Restore saved captions lang once (only before the user has interacted).
        if (this.persistPrefs && !captionsPrefRestored && !this.captionsTouched) {
          captionsPrefRestored = true;
          const prefs = this.loadPlayerPrefs();
          if (prefs.captionsLang !== undefined && prefs.captionsLang !== null) {
            const available = states.find((s) => s.lang === prefs.captionsLang);
            if (available) this.selectPluginCaptions(prefs.captionsLang);
          }
        }
      }),
    );
  }

  protected override render(): unknown {
    return html`
      <video data-f8-player-video class=${this.videoClass ?? ""} playsinline></video>
      ${this.controls && this.qualitySwitchOverlay
        ? html`<div
            class="f8p-spinner"
            data-f8-player-quality-switch
            role="status"
            aria-live="polite"
            aria-label="Đang đổi độ phân giải"
          ></div>`
        : null}
      ${this.controls ? this.renderCenterTapLayer() : null}
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
      return;
    }

    this.setAttribute("data-f8-player", "");
    this.setAttribute("data-theme", this.theme || "classroom");
  }

  private getStateSnapshot(): PlayerState | null {
    return this.controller.player?.getState() ?? null;
  }

  private renderCenterTapLayer(): unknown {
    if (!this.controls) return null;
    const state = this.getStateSnapshot();
    if (!state?.source?.src || detectSourceType(state.source) === "youtube") {
      return null;
    }
    const isPlaying = state.status === "playing";
    return html`
      <div
        data-f8-player-center-tap
        role="button"
        tabindex="0"
        aria-label=${isPlaying ? "Tạm dừng" : "Phát"}
        @click=${this.handleCenterTapClick}
        @keydown=${this.handleCenterTapKeydown}
      >
        ${isPlaying
          ? null
          : html`<span data-f8-player-big-play>${this.renderIcon("play")}</span>`}
      </div>
    `;
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
        data-f8-player-controls-layout="two-row"
      >
        <div data-f8-player-controls-row="timeline">
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
            @pointermove=${this.handleSeekPointerMove}
            @pointerleave=${this.handleSeekPointerLeave}
          >
            <div
              data-f8p-seek-buffered
              style=${`width: ${bufferedPct}%`}
              aria-hidden="true"
            ></div>
            ${this.renderThumbnailTile(max)}
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
        </div>

        <div data-f8-player-controls-row="actions">
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

          ${this.renderCaptionsControl(state)} ${this.renderQualityControl(state)}
          ${this.renderSettingsControl(state)} ${this.renderPipButton(state)}

          <button
            type="button"
            class="f8p-btn"
            aria-label=${fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            aria-pressed=${fullscreen}
            data-f8-player-control="fullscreen"
            @click=${this.handleFullscreenClick}
          >
            ${this.renderIcon(fullscreen ? "compress" : "maximize")}
          </button>
        </div>
      </div>
    `;
  }

  private renderQualityControl(state: PlayerState | null): unknown {
    const qualities = state?.qualities ?? [];
    if (qualities.length === 0) return null;
    const activeQuality = state?.activeQuality;
    const activeParts = activeQuality
      ? this.formatQualityParts(activeQuality.label)
      : { text: "Tự động", badge: null };
    const options: ControlMenuOption[] = [
      {
        value: "auto",
        label: "Tự động",
        active: !activeQuality,
        onSelect: () => this.selectQuality("auto"),
      },
      ...qualities.map((quality) => {
        const parts = this.formatQualityParts(quality.label);
        return {
          value: quality.id,
          label: parts.text,
          badge: parts.badge,
          active: activeQuality?.id === quality.id,
          onSelect: () => this.selectQuality(quality.id),
        };
      }),
    ];

    return this.renderControlMenu({
      menuId: "quality",
      control: "quality",
      ariaLabel: "Chất lượng video",
      active: Boolean(activeQuality),
      trigger: html`
        <span data-f8-player-quality-value aria-hidden="true">
          <span data-f8-player-quality-text>${activeParts.text}</span>
          ${activeParts.badge ? html`<span data-f8-player-quality-badge>${activeParts.badge}</span>` : null}
        </span>
      `,
      options,
    });
  }

  private renderSettingsControl(state: PlayerState | null): unknown {
    const playbackRate = state?.playbackRate ?? 1;
    const rates = this.playbackRates ?? [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const options = rates.map((rate) => ({
      value: String(rate),
      label: rate === 1 ? "Bình thường" : `${rate}×`,
      active: rate === playbackRate,
      onSelect: () => this.selectPlaybackRate(rate),
    }));

    return this.renderControlMenu({
      menuId: "speed",
      control: "settings",
      ariaLabel: "Tốc độ phát",
      active: playbackRate !== 1,
      trigger: html`
        ${this.renderIcon("settings")}
        <span data-f8p-trigger-label>${playbackRate === 1 ? "1×" : `${playbackRate}×`}</span>
      `,
      options,
    });
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

  private renderCaptionsControl(state: PlayerState | null): unknown {
    const pluginTracks = state?.source?.tracks ?? [];

    if (pluginTracks.length > 0) {
      if (this.activeCaptionsLang === null && !this.captionsTouched) {
        const def = pluginTracks.find((t) => t.default);
        if (def) this.activeCaptionsLang = def.srcLang;
      }
      const isActive = this.activeCaptionsLang !== null;
      const activeTrack = pluginTracks.find((t) => t.srcLang === this.activeCaptionsLang);
      const options: ControlMenuOption[] = [
        {
          value: "__off__",
          label: "Tắt phụ đề",
          active: !isActive,
          onSelect: () => this.selectPluginCaptions("__off__"),
        },
        ...pluginTracks.map((track) => ({
          value: track.srcLang,
          label: track.label,
          active: track.srcLang === this.activeCaptionsLang,
          onSelect: () => this.selectPluginCaptions(track.srcLang),
        })),
      ];

      return this.renderControlMenu({
        menuId: "captions",
        control: "captions",
        ariaLabel: "Phụ đề",
        active: isActive,
        trigger: this.renderCaptionsTrigger(activeTrack?.srcLang ?? null),
        options,
      });
    }

    const nativeTracks = this.videoEl
      ? Array.from(this.videoEl.textTracks).filter(
          (t) => t.kind === "captions" || t.kind === "subtitles",
        )
      : [];
    if (nativeTracks.length === 0) return null;

    const showingTrack = nativeTracks.find((t) => t.mode === "showing");
    const isActive = showingTrack != null;
    const options: ControlMenuOption[] = [
      {
        value: "__off__",
        label: "Tắt phụ đề",
        active: !isActive,
        onSelect: () => this.selectNativeCaptions("__off__"),
      },
      ...nativeTracks.map((track) => ({
        value: track.language,
        label: track.label || track.language || "Phụ đề",
        active: track === showingTrack,
        onSelect: () => this.selectNativeCaptions(track.language),
      })),
    ];

    return this.renderControlMenu({
      menuId: "captions",
      control: "captions",
      ariaLabel: "Phụ đề",
      active: isActive,
      trigger: this.renderCaptionsTrigger(showingTrack?.language ?? null),
      options,
    });
  }

  private renderCaptionsTrigger(lang: string | null): unknown {
    return html`
      ${this.renderIcon("cc")}
      <span data-f8p-trigger-label>${lang ? lang.toUpperCase() : "CC"}</span>
    `;
  }

  private renderControlMenu(params: {
    menuId: ControlMenuId;
    control: "captions" | "quality" | "settings";
    ariaLabel: string;
    trigger: unknown;
    options: ControlMenuOption[];
    active?: boolean;
  }): unknown {
    const open = this.openMenu === params.menuId;
    const panelId = `f8p-${params.menuId}-menu`;

    return html`
      <span
        class="f8p-menu"
        data-f8-player-control=${params.control}
        data-f8p-control-menu=${params.menuId}
        ?data-f8p-menu-open=${open}
        ?data-f8-player-captions-active=${params.control === "captions" && Boolean(params.active)}
      >
        <button
          type="button"
          class="f8p-menu-trigger"
          aria-label=${params.ariaLabel}
          aria-haspopup="listbox"
          aria-expanded=${open ? "true" : "false"}
          aria-controls=${panelId}
          data-f8p-control-trigger=${params.menuId}
          @click=${() => this.toggleMenu(params.menuId)}
          @keydown=${(event: KeyboardEvent) => this.handleMenuTriggerKeydown(event, params.menuId)}
        >
          ${params.trigger}
        </button>
        ${open
          ? html`
              <div
                id=${panelId}
                class="f8p-menu-popover"
                role="listbox"
                aria-label=${params.ariaLabel}
                data-f8p-control-popover=${params.menuId}
                @keydown=${this.handleMenuListboxKeydown}
              >
                ${params.options.map(
                  (option) => html`
                    <button
                      type="button"
                      class="f8p-menu-option"
                      role="option"
                      aria-selected=${option.active ? "true" : "false"}
                      data-f8p-control-option
                      data-value=${option.value}
                      @mousedown=${this.handleMenuOptionMouseDown}
                      @click=${() => this.selectMenuOption(option)}
                    >
                      <span data-f8p-option-label>${option.label}</span>
                      ${option.badge ? html`<span data-f8p-option-badge>${option.badge}</span>` : null}
                      ${option.active ? html`<span data-f8p-option-check aria-hidden="true">✓</span>` : null}
                    </button>
                  `,
                )}
              </div>
            `
          : null}
      </span>
    `;
  }

  private renderThumbnailTile(max: number): unknown {
    const hover = this.thumbnailHover;
    if (!hover || this.thumbnailCues.length === 0) return null;
    const cue = findCueAt(this.thumbnailCues, hover.time);
    if (!cue) return null;
    // Tile dims from the VTT cue (`#xywh=`); fall back to sane defaults when
    // the cue body has no spatial hint (legacy or single-image sprites).
    const tileW = cue.w > 0 ? cue.w : THUMB_PREVIEW_WIDTH;
    const tileH = cue.h > 0 ? cue.h : THUMB_PREVIEW_HEIGHT;
    void max;
    const scale = 0.5;
    const visualW = tileW * scale;
    const visualH = tileH * scale;
    const edgePadding = 8;
    const hostLeftInWrapper = -hover.wrapperLeft;
    const hostRightInWrapper = hover.hostWidth - hover.wrapperLeft;
    const minCenter = hostLeftInWrapper + visualW / 2 + edgePadding;
    const maxCenter = hostRightInWrapper - visualW / 2 - edgePadding;
    const center =
      minCenter <= maxCenter
        ? Math.min(maxCenter, Math.max(minCenter, hover.x))
        : (hostLeftInWrapper + hostRightInWrapper) / 2;
    const tileStyle = [
      "position:absolute",
      `bottom:calc(100% + 0.8rem)`,
      `left:${center - visualW / 2}px`,
      `width:${visualW}px`,
      `height:${visualH}px`,
      "pointer-events:none",
      "z-index:2",
    ].join(";");
    const imageStyle = [
      `width:${tileW}px`,
      `height:${tileH}px`,
      `transform:scale(${scale})`,
      "transform-origin:0 0",
      `background-image:url("${cue.src}")`,
      "background-repeat:no-repeat",
      `background-position:-${cue.x}px -${cue.y}px`,
    ].join(";");
    const labelStyle = [
      "position:absolute",
      `left:${center}px`,
      "bottom:calc(100% + 0.2rem)",
      "transform:translateX(-50%)",
      "color:#fff",
      "font-size:1.2rem",
      "font-variant-numeric:tabular-nums",
      "text-shadow:0 1px 0.2rem rgba(0,0,0,0.55)",
      "white-space:nowrap",
      "pointer-events:none",
      "z-index:2",
    ].join(";");
    return html`
      <div data-f8p-seek-thumbnail aria-hidden="true" style=${tileStyle}>
        <div data-f8p-seek-thumbnail-image style=${imageStyle}></div>
      </div>
      <span data-f8p-seek-thumbnail-time aria-hidden="true" style=${labelStyle}>
        ${this.formatTimeLabel(hover.time)}
      </span>
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

  private handleCenterTapClick(e: Event): void {
    e.stopPropagation();
    this.handlePlayPauseClick();
  }

  private handleCenterTapKeydown(e: KeyboardEvent): void {
    if (e.key !== "Enter" && e.key !== " ") {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.handlePlayPauseClick();
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

  private selectQuality(value: string): void {
    const player = this.controller.player;
    if (!player) return;
    if (value === "auto") {
      player.commands.run("hls-quality:setAuto");
      return;
    }
    const quality = player.getState().qualities.find((item) => item.id === value);
    if (quality)
      player.commands.run("hls-quality:set", quality as unknown as Record<string, unknown>);
  }

  private selectPlaybackRate(value: number): void {
    this.controller.player?.setPlaybackRate(value);
  }

  private selectPluginCaptions(value: string): void {
    this.captionsTouched = true;
    if (value === "__off__") {
      this.controller.player?.commands.run("subtitles:off");
      this.activeCaptionsLang = null;
    } else {
      this.controller.player?.commands.run(
        "subtitles:setLang",
        value as unknown as Record<string, unknown>,
      );
      this.activeCaptionsLang = value;
    }
    if (this.persistPrefs) {
      this.savePlayerPrefs({ captionsLang: value === "__off__" ? null : value });
    }
  }

  private selectNativeCaptions(value: string): void {
    if (!this.videoEl) return;
    const nativeTracks = Array.from(this.videoEl.textTracks).filter(
      (t) => t.kind === "captions" || t.kind === "subtitles",
    );
    for (const t of nativeTracks) {
      t.mode = value !== "__off__" && t.language === value ? "showing" : "hidden";
    }
    this.captionsTouched = true;
    if (this.persistPrefs) {
      this.savePlayerPrefs({ captionsLang: value === "__off__" ? null : value });
    }
  }

  private handlePipClick(): void {
    this.controller.player?.commands.run("pip:toggle");
  }

  private handleFullscreenClick(): void {
    this.controller.player?.commands.run("fullscreen:toggle");
  }

  private handleSeekPointerMove = (event: PointerEvent): void => {
    const wrapper = event.currentTarget as HTMLElement | null;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0) return;
    const hostRect = this.getBoundingClientRect();
    const duration = this.controller.player?.getState().duration ?? 0;
    const max = Number.isFinite(duration) && duration > 0 ? duration : 1;
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const rawTime = (x / rect.width) * max;
    const time = Math.min(rawTime, Math.max(0, max - 0.001));
    this.thumbnailHover = {
      x,
      time,
      hostWidth: hostRect.width > 0 ? hostRect.width : rect.width,
      wrapperLeft: rect.left - hostRect.left,
    };
    this.requestUpdate();
  };

  private handleSeekPointerLeave = (): void => {
    if (!this.thumbnailHover) return;
    this.thumbnailHover = null;
    this.requestUpdate();
  };

  private toggleMenu(menuId: ControlMenuId): void {
    const willOpen = this.openMenu !== menuId;
    this.openMenu = willOpen ? menuId : null;
    this.requestUpdate();
    if (willOpen) this.focusSelectedMenuOption(menuId);
  }

  private closeOpenMenu(): void {
    if (!this.openMenu) return;
    this.openMenu = null;
    this.requestUpdate();
  }

  private selectMenuOption(option: ControlMenuOption): void {
    this.closeOpenMenu();
    option.onSelect();
  }

  private focusSelectedMenuOption(menuId: ControlMenuId): void {
    void this.updateComplete.then(() => {
      const popover = this.querySelector<HTMLElement>(`[data-f8p-control-popover="${menuId}"]`);
      const selected = popover?.querySelector<HTMLElement>('[data-f8p-control-option][aria-selected="true"]');
      const first = popover?.querySelector<HTMLElement>("[data-f8p-control-option]");
      (selected ?? first)?.focus();
    });
  }

  private focusMenuTrigger(menuId: ControlMenuId): void {
    this.querySelector<HTMLElement>(`[data-f8p-control-trigger="${menuId}"]`)?.focus();
  }

  private handleMenuTriggerKeydown(event: KeyboardEvent, menuId: ControlMenuId): void {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (this.openMenu !== menuId) {
      this.openMenu = menuId;
      this.requestUpdate();
    }
    this.focusSelectedMenuOption(menuId);
  }

  private handleMenuListboxKeydown = (event: KeyboardEvent): void => {
    const popover = event.currentTarget as HTMLElement;
    const options = Array.from(popover.querySelectorAll<HTMLElement>("[data-f8p-control-option]"));
    const currentIndex = Math.max(0, options.indexOf(document.activeElement as HTMLElement));

    if (event.key === "Escape") {
      event.preventDefault();
      const menuId = this.openMenu;
      this.closeOpenMenu();
      if (menuId) this.focusMenuTrigger(menuId);
      return;
    }

    const nextIndex =
      event.key === "ArrowDown"
        ? Math.min(options.length - 1, currentIndex + 1)
        : event.key === "ArrowUp"
          ? Math.max(0, currentIndex - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? options.length - 1
              : -1;

    if (nextIndex < 0) return;
    event.preventDefault();
    options[nextIndex]?.focus();
  };

  private formatTimeLabel(seconds: number): string {
    if (!Number.isFinite(seconds)) return "Trực tiếp";
    return formatTime(Math.max(0, seconds));
  }

  private formatQualityParts(label: string): { text: string; badge: string | null; optionLabel: string } {
    const match = label.match(/^(\d+)p$/i);
    if (!match) return { text: label, badge: null, optionLabel: label };
    const text = `${match[1]}p`;
    return { text, badge: "HD", optionLabel: `${text} HD` };
  }

  private toDateTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return "PT0S";
    return `PT${Math.round(Math.max(0, seconds))}S`;
  }

  // ------------------------------------------------------------------------
  // Internal — player preferences persistence (localStorage)
  // ------------------------------------------------------------------------

  private applyLsVolumeMutedRate(player: Player, prefs: Partial<PlayerPrefs>): void {
    if (prefs.volume != null) player.setVolume(prefs.volume);
    if (prefs.muted != null) player.setMuted(prefs.muted);
    if (prefs.playbackRate != null) {
      player.setPlaybackRate(prefs.playbackRate);
      this.playbackPrefsLastLsPlaybackRate = prefs.playbackRate;
      this.playbackPrefsLastLsRateAppliedAt = performance.now();
    }
  }

  private installPrefsListeners(): void {
    const player = this.controller.player;
    if (!player || !this.persistPrefs) return;

    this.playbackPrefsRestoreOnPlay = true;

    const prefs = this.loadPlayerPrefs();
    this.applyLsVolumeMutedRate(player, prefs);
    this.schedulePlaybackPrefsSaveUnlock();

    // Restore quality once the qualities list becomes available.
    // YouTube-style: prefer saved quality but silently skip if not in the list
    // (adaptive quality will take over in that case).
    if (prefs.qualityHeight != null) {
      const tryApplyQuality = (qualities: readonly QualityLevel[]): boolean => {
        const level = qualities.find((q) => q.height === prefs.qualityHeight);
        if (level) {
          player.commands.run("hls:setQuality", level);
          return true;
        }
        return false;
      };
      const state = player.getState();
      if (!tryApplyQuality(state.qualities)) {
        const unsub = player.subscribe(
          (s) => s.qualities,
          (qualities) => {
            if (tryApplyQuality(qualities)) unsub();
          },
        );
      }
    }

    // Re-bootstrap after metadata — engine may clamp playbackRate or mute state before LS wins.
    this.controller.on("ready", () => {
      if (!this.persistPrefs) return;
      this.playbackPrefsRestoreOnPlay = true;
      this.applyLsVolumeMutedRate(player, this.loadPlayerPrefs());
      this.schedulePlaybackPrefsSaveUnlock();
    });

    this.controller.on("play", () => {
      if (!this.persistPrefs) return;
      if (this.playbackPrefsRestoreOnPlay) {
        this.playbackPrefsRestoreOnPlay = false;
        this.applyLsVolumeMutedRate(player, this.loadPlayerPrefs());
      }
      this.schedulePlaybackPrefsSaveUnlock();
    });

    this.controller.on("volumechange", ({ volume, muted }) => {
      if (!this.playbackPrefsAllowSave) return;
      this.savePlayerPrefs({ volume, muted });
    });

    this.controller.on("ratechange", ({ playbackRate }) => {
      if (!this.playbackPrefsAllowSave) return;
      const msSinceLsRate =
        this.playbackPrefsLastLsPlaybackRate != null &&
        this.playbackPrefsLastLsRateAppliedAt > 0
          ? Math.round(performance.now() - this.playbackPrefsLastLsRateAppliedAt)
          : null;
      const skipSpuriousRevertToOne =
        playbackRate === 1 &&
        this.playbackPrefsLastLsPlaybackRate != null &&
        this.playbackPrefsLastLsPlaybackRate !== 1 &&
        msSinceLsRate != null &&
        msSinceLsRate < 800;
      if (skipSpuriousRevertToOne) return;
      this.savePlayerPrefs({ playbackRate });
      this.playbackPrefsLastLsPlaybackRate = null;
      this.playbackPrefsLastLsRateAppliedAt = 0;
    });

    // Only persist user-chosen quality (auto=false); ABR selections are ignored.
    this.controller.on("qualitychange", ({ quality, auto }) => {
      if (!auto) {
        this.savePlayerPrefs({ qualityHeight: quality?.height ?? null });
      }
    });
  }

  private loadPlayerPrefs(): Partial<PlayerPrefs> {
    try {
      const raw = localStorage.getItem(this.prefsKey);
      return raw ? (JSON.parse(raw) as Partial<PlayerPrefs>) : {};
    } catch {
      return {};
    }
  }

  private savePlayerPrefs(patch: Partial<PlayerPrefs>): void {
    try {
      const current = this.loadPlayerPrefs();
      localStorage.setItem(this.prefsKey, JSON.stringify({ ...current, ...patch }));
    } catch {
      // Ignore: private browsing mode, storage quota exceeded, etc.
    }
  }

  // ------------------------------------------------------------------------
  // Internal — re-emit every core event as a CustomEvent("f8-player:<name>")
  // ------------------------------------------------------------------------

  private installEventBridges(): void {
    if (this.bridgesInstalled) return;
    const events: ReadonlyArray<Exclude<keyof PlayerEvents, "qualityswitch">> = [
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
    this.controller.on("qualityswitch", (payload: PlayerEvents["qualityswitch"]) => {
      this.qualitySwitchOverlay = payload.active;
      this.requestUpdate();
      this.dispatchEvent(
        new CustomEvent("f8-player:qualityswitch", {
          detail: payload,
          bubbles: true,
          composed: true,
        }),
      );
    });
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

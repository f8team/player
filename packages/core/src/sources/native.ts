/**
 * Always-on native loader. Handles MP4, WebM, blob, data URLs, and acts as a
 * `"maybe"` fallback for unknown URLs.
 *
 * Golden cases: G3 (public video, native MP4), G5 (story composer blob),
 * G6 (landing hero), G10 (media manager modal).
 */

import { type SourceDescriptor, type SourceLoader, type SourceProvider } from "../types/source.js";
import { detectSourceType } from "../util/url.js";

class NativeLoader implements SourceLoader {
  private video: HTMLVideoElement | null = null;
  private cleanups: Array<() => void> = [];

  async attach(video: HTMLVideoElement, source: SourceDescriptor): Promise<void> {
    this.detach();
    this.video = video;
    return new Promise<void>((resolve, reject) => {
      const onMeta = (): void => {
        cleanupListeners();
        resolve();
      };
      const onError = (): void => {
        cleanupListeners();
        const err = video.error;
        const message = err
          ? `MediaError code=${err.code} message=${err.message}`
          : "Native loader failed";
        reject(new Error(message));
      };
      const cleanupListeners = (): void => {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("error", onError);
      };

      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("error", onError);
      this.cleanups.push(cleanupListeners);

      video.src = source.src;
      // `load()` forces the browser to start fetching even if the src didn't
      // visibly change (helps with `blob:` reuse and same-URL retries).
      video.load();
    });
  }

  detach(): void {
    while (this.cleanups.length) {
      try {
        this.cleanups.pop()?.();
      } catch {
        // ignore
      }
    }
    if (this.video) {
      // Removing the src lets the browser free the underlying resource.
      try {
        this.video.removeAttribute("src");
        this.video.load();
      } catch {
        // ignore
      }
      this.video = null;
    }
  }
}

/** Native source provider. Always available, registered by `createPlayer`. */
export const nativeProvider: SourceProvider = {
  name: "native",
  canHandle: (source) => {
    if (source.type === "native") return true;
    if (source.type === "mp4") return true;
    // Explicit non-native types (`dash`, `hls`, `youtube`, ...) must be
    // handled by their dedicated provider; surfacing as a loadFailed when
    // no provider matches is more useful than silently degrading.
    if (source.type && source.type !== "auto") return false;
    const type = detectSourceType(source);
    if (type === "mp4") return true;
    if (type === "hls" || type === "youtube") return false;
    // Unknown URL with auto/no type — let dedicated providers win first;
    // if none match, the registry falls back to this `"maybe"`.
    return "maybe";
  },
  createLoader: () => new NativeLoader(),
};

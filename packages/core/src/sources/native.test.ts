import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type SourceDescriptor } from "../types/source.js";

import { nativeProvider } from "./native.js";

describe("nativeProvider — canHandle", () => {
  it("matches MP4/WebM/blob/data", () => {
    expect(nativeProvider.canHandle({ src: "https://x.com/file.mp4" })).toBe(true);
    expect(nativeProvider.canHandle({ src: "https://x.com/file.webm" })).toBe(true);
    expect(nativeProvider.canHandle({ src: "blob:abc" })).toBe(true);
    expect(nativeProvider.canHandle({ src: "data:video/mp4;base64,X" })).toBe(true);
  });

  it("matches type='native' explicitly", () => {
    expect(nativeProvider.canHandle({ src: "https://x.com/foo.m3u8", type: "native" })).toBe(true);
  });

  it("returns 'maybe' for unknown URLs", () => {
    expect(nativeProvider.canHandle({ src: "https://x.com/unknown" })).toBe("maybe");
  });

  it("returns false for HLS / YouTube URLs (dedicated providers handle them)", () => {
    expect(nativeProvider.canHandle({ src: "https://x.com/file.m3u8" })).toBe(false);
    expect(nativeProvider.canHandle({ src: "https://youtube.com/watch?v=abc" })).toBe(false);
  });
});

describe("nativeProvider — loader lifecycle", () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    video = document.createElement("video");
    document.body.appendChild(video);
  });

  afterEach(() => {
    video.remove();
  });

  it("resolves on loadedmetadata", async () => {
    const loader = nativeProvider.createLoader();
    const source: SourceDescriptor = { src: "https://x.com/file.mp4" };
    const promise = loader.attach(video, source);
    // jsdom doesn't fire loadedmetadata for us; dispatch manually.
    queueMicrotask(() => video.dispatchEvent(new Event("loadedmetadata")));
    await expect(promise).resolves.toBeUndefined();
    expect(video.src).toContain("file.mp4");
  });

  it("rejects when the video errors during load", async () => {
    const loader = nativeProvider.createLoader();
    const promise = loader.attach(video, { src: "https://x.com/bad.mp4" });
    queueMicrotask(() => {
      Object.defineProperty(video, "error", {
        configurable: true,
        get: () => ({ code: 4, message: "decode error" }) as MediaError,
      });
      video.dispatchEvent(new Event("error"));
    });
    await expect(promise).rejects.toThrow(/decode error|MediaError/);
  });

  it("detach() removes the src and listeners", async () => {
    const loader = nativeProvider.createLoader();
    const promise = loader.attach(video, { src: "https://x.com/file.mp4" });
    queueMicrotask(() => video.dispatchEvent(new Event("loadedmetadata")));
    await promise;
    loader.detach();
    expect(video.getAttribute("src")).toBeNull();
  });

  it("attach replaces a previously attached source", async () => {
    const loader = nativeProvider.createLoader();
    const p1 = loader.attach(video, { src: "https://x.com/a.mp4" });
    queueMicrotask(() => video.dispatchEvent(new Event("loadedmetadata")));
    await p1;

    const p2 = loader.attach(video, { src: "https://x.com/b.mp4" });
    queueMicrotask(() => video.dispatchEvent(new Event("loadedmetadata")));
    await p2;

    expect(video.src).toContain("b.mp4");
  });

  it("detach() is idempotent", async () => {
    const loader = nativeProvider.createLoader();
    const p = loader.attach(video, { src: "https://x.com/file.mp4" });
    queueMicrotask(() => video.dispatchEvent(new Event("loadedmetadata")));
    await p;
    expect(() => {
      loader.detach();
      loader.detach();
    }).not.toThrow();
  });

  it("survives a video.load() throw inside detach", async () => {
    const loader = nativeProvider.createLoader();
    const p = loader.attach(video, { src: "https://x.com/file.mp4" });
    queueMicrotask(() => video.dispatchEvent(new Event("loadedmetadata")));
    await p;
    const spy = vi.spyOn(video, "load").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => loader.detach()).not.toThrow();
    spy.mockRestore();
  });
});

import type { Player, PlayerState, PluginHost, SourceDescriptor } from "@f8team/reel-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createThumbnailsPlugin } from "../thumbnails.js";

const VTT_BODY = `WEBVTT

00:00:00.000 --> 00:00:10.000
sprites/01.jpg#xywh=0,0,160,90

00:00:10.000 --> 00:00:20.000
sprites/01.jpg#xywh=160,0,160,90
`;

function makePlayer(): Player {
  return {} as unknown as Player;
}

interface FakeStore {
  state: PlayerState;
  setSource(src: SourceDescriptor | null | undefined): void;
  subscribers: Array<{
    selector: (s: PlayerState) => unknown;
    listener: (v: unknown) => void;
    last: unknown;
  }>;
}

function makeStore(initial: SourceDescriptor | null = null): FakeStore {
  const subscribers: FakeStore["subscribers"] = [];
  return {
    state: { source: initial } as unknown as PlayerState,
    subscribers,
    setSource(src) {
      this.state = { ...this.state, source: src ?? null } as PlayerState;
      for (const sub of subscribers) {
        const next = sub.selector(this.state);
        if (next !== sub.last) {
          sub.last = next;
          sub.listener(next);
        }
      }
    },
  };
}

function makeHost(store: FakeStore): PluginHost & {
  _events: Array<{ name: string; payload: unknown }>;
  _commands: Record<string, (p: unknown) => void>;
} {
  const events: Array<{ name: string; payload: unknown }> = [];
  const commands: Record<string, (p: unknown) => void> = {};
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: {
      add: vi.fn().mockImplementation((name: string, h: (p: unknown) => void) => {
        commands[name] = h;
        return () => {
          delete commands[name];
        };
      }),
      run: vi.fn().mockImplementation((name: string, p?: unknown) => commands[name]?.(p)),
      has: vi.fn().mockImplementation((name: string) => name in commands),
    },
    store: {
      getState: () => store.state,
      subscribe: vi
        .fn()
        .mockImplementation(<U>(selector: (s: PlayerState) => U, listener: (v: U) => void) => {
          const entry = {
            selector,
            listener: listener as (v: unknown) => void,
            last: selector(store.state),
          };
          store.subscribers.push(entry);
          return () => {
            const i = store.subscribers.indexOf(entry);
            if (i >= 0) store.subscribers.splice(i, 1);
          };
        }),
    },
    emit: vi.fn().mockImplementation((name: string, payload?: unknown) => {
      events.push({ name, payload });
    }),
    _events: events,
    _commands: commands,
  };
}

const flush = async (): Promise<void> => {
  // Allow microtask + macrotask for fetch chain.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("createThumbnailsPlugin", () => {
  beforeEach(() => {
    // Each test installs its own fetch mock.
    (globalThis.fetch as unknown) = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plugin name is 'thumbnails'", () => {
    expect(createThumbnailsPlugin().name).toBe("thumbnails");
  });

  it("does nothing when source has no thumbnails descriptor", async () => {
    const store = makeStore({ src: "video.m3u8" } as SourceDescriptor);
    const host = makeHost(store);
    const fetchSpy = vi.fn();
    (globalThis.fetch as unknown) = fetchSpy;

    createThumbnailsPlugin().setup(makePlayer(), host);
    await flush();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(host._events).toHaveLength(0);
  });

  it("fetches the VTT and emits thumbnails:ready on success", async () => {
    const store = makeStore({
      src: "video.m3u8",
      thumbnails: { src: "https://cdn.example.com/v/thumbs.vtt" },
    } as SourceDescriptor);
    const host = makeHost(store);

    (globalThis.fetch as unknown) = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(VTT_BODY),
    });

    createThumbnailsPlugin().setup(makePlayer(), host);
    await flush();

    const ready = host._events.find((e) => e.name === "thumbnails:ready");
    expect(ready).toBeDefined();
    const cues = (ready!.payload as { cues: unknown[] }).cues;
    expect(cues).toHaveLength(2);
  });

  it("passes credentials option through fetch when descriptor opts in", async () => {
    const store = makeStore({
      src: "video.m3u8",
      thumbnails: { src: "https://cdn.example.com/v/thumbs.vtt", withCredentials: true },
    } as SourceDescriptor);
    const host = makeHost(store);

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(VTT_BODY),
    });
    (globalThis.fetch as unknown) = fetchSpy;

    createThumbnailsPlugin().setup(makePlayer(), host);
    await flush();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://cdn.example.com/v/thumbs.vtt",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("emits thumbnails:cleared when fetch fails", async () => {
    const store = makeStore({
      src: "video.m3u8",
      thumbnails: { src: "https://cdn.example.com/v/thumbs.vtt" },
    } as SourceDescriptor);
    const host = makeHost(store);

    (globalThis.fetch as unknown) = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve("") });

    createThumbnailsPlugin().setup(makePlayer(), host);
    await flush();

    const events = host._events.map((e) => e.name);
    expect(events).toContain("thumbnails:cleared");
    expect(events).not.toContain("thumbnails:ready");
  });

  it("re-fetches when source.thumbnails URL changes", async () => {
    const store = makeStore({
      src: "video1.m3u8",
      thumbnails: { src: "https://cdn.example.com/v/thumbs1.vtt" },
    } as SourceDescriptor);
    const host = makeHost(store);

    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(VTT_BODY) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(VTT_BODY) });
    (globalThis.fetch as unknown) = fetchSpy;

    createThumbnailsPlugin().setup(makePlayer(), host);
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    store.setSource({
      src: "video2.m3u8",
      thumbnails: { src: "https://cdn.example.com/v/thumbs2.vtt" },
    } as SourceDescriptor);
    await flush();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const readyEvents = host._events.filter((e) => e.name === "thumbnails:ready");
    expect(readyEvents).toHaveLength(2);
  });

  it("clears cues when source.thumbnails is removed", async () => {
    const store = makeStore({
      src: "video.m3u8",
      thumbnails: { src: "https://cdn.example.com/v/thumbs.vtt" },
    } as SourceDescriptor);
    const host = makeHost(store);

    (globalThis.fetch as unknown) = vi
      .fn()
      .mockResolvedValue({ ok: true, text: () => Promise.resolve(VTT_BODY) });

    createThumbnailsPlugin().setup(makePlayer(), host);
    await flush();
    host._events.length = 0;

    store.setSource({ src: "video.m3u8" } as SourceDescriptor);
    await flush();

    expect(host._events.some((e) => e.name === "thumbnails:cleared")).toBe(true);
  });

  it("aborts the in-flight fetch and unsubscribes on dispose", async () => {
    const store = makeStore({
      src: "video.m3u8",
      thumbnails: { src: "https://cdn.example.com/v/thumbs.vtt" },
    } as SourceDescriptor);
    const host = makeHost(store);

    let fetchAbortCalled = false;
    (globalThis.fetch as unknown) = vi.fn().mockImplementation((_url, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init.signal as AbortSignal;
        signal.addEventListener("abort", () => {
          fetchAbortCalled = true;
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    });

    const dispose = createThumbnailsPlugin().setup(makePlayer(), host);
    expect(typeof dispose).toBe("function");
    dispose!();
    await flush();

    expect(fetchAbortCalled).toBe(true);
    expect(store.subscribers).toHaveLength(0);
  });

  it("registers thumbnails:reload and thumbnails:clear commands", async () => {
    const store = makeStore({
      src: "video.m3u8",
      thumbnails: { src: "https://cdn.example.com/v/thumbs.vtt" },
    } as SourceDescriptor);
    const host = makeHost(store);

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(VTT_BODY) });
    (globalThis.fetch as unknown) = fetchSpy;

    createThumbnailsPlugin().setup(makePlayer(), host);
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    host._commands["thumbnails:reload"]?.(undefined);
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    host._commands["thumbnails:clear"]?.(undefined);
    await flush();
    expect(host._events.some((e) => e.name === "thumbnails:cleared")).toBe(true);
  });
});

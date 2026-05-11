import { describe, expect, it } from "vitest";

import {
  detectSourceType,
  looksLikeHls,
  looksLikeProgressive,
  looksLikeYouTube,
  resolveWithCredentials,
} from "./url.js";

describe("looksLikeHls", () => {
  it("accepts m3u8 URLs", () => {
    expect(looksLikeHls("https://cdn.example.com/master.m3u8")).toBe(true);
    expect(looksLikeHls("https://cdn.example.com/path/master.M3U8?token=abc")).toBe(true);
    expect(looksLikeHls("/playlist.m3u8")).toBe(true);
  });

  it("accepts MIME-hinted URLs", () => {
    expect(
      looksLikeHls("https://cdn.example.com/playlist?type=application/vnd.apple.mpegurl"),
    ).toBe(true);
  });

  it("rejects YouTube-hosted URLs even if they end in .m3u8", () => {
    expect(looksLikeHls("https://youtube.com/watch?v=abc.m3u8")).toBe(false);
  });

  it("rejects MP4 / WebM / blob / empty inputs", () => {
    expect(looksLikeHls("https://cdn.example.com/file.mp4")).toBe(false);
    expect(looksLikeHls("blob:abc")).toBe(false);
    expect(looksLikeHls("")).toBe(false);
    expect(looksLikeHls(undefined)).toBe(false);
    expect(looksLikeHls(null)).toBe(false);
  });
});

describe("looksLikeYouTube", () => {
  it("matches youtube.com and youtu.be", () => {
    expect(looksLikeYouTube("https://youtube.com/watch?v=abc")).toBe(true);
    expect(looksLikeYouTube("https://www.youtube.com/embed/abc")).toBe(true);
    expect(looksLikeYouTube("https://youtu.be/abc")).toBe(true);
  });

  it("rejects MP4 and HLS URLs", () => {
    expect(looksLikeYouTube("https://cdn.example.com/file.mp4")).toBe(false);
    expect(looksLikeYouTube("https://cdn.example.com/master.m3u8")).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(looksLikeYouTube("")).toBe(false);
    expect(looksLikeYouTube(null)).toBe(false);
  });
});

describe("looksLikeProgressive", () => {
  it("matches MP4/M4V/WebM/Ogg by extension", () => {
    expect(looksLikeProgressive("https://cdn.example.com/file.mp4")).toBe(true);
    expect(looksLikeProgressive("https://cdn.example.com/file.m4v")).toBe(true);
    expect(looksLikeProgressive("https://cdn.example.com/file.webm")).toBe(true);
    expect(looksLikeProgressive("https://cdn.example.com/file.ogv")).toBe(true);
    expect(looksLikeProgressive("https://cdn.example.com/file.MP4?cache=1")).toBe(true);
  });

  it("matches blob: and data: schemes", () => {
    expect(looksLikeProgressive("blob:https://example.com/abc")).toBe(true);
    expect(looksLikeProgressive("data:video/mp4;base64,XYZ")).toBe(true);
  });

  it("rejects HLS, YouTube, and empty inputs", () => {
    expect(looksLikeProgressive("https://cdn.example.com/master.m3u8")).toBe(false);
    expect(looksLikeProgressive("https://youtube.com/watch?v=abc")).toBe(false);
    expect(looksLikeProgressive("")).toBe(false);
    expect(looksLikeProgressive(undefined)).toBe(false);
  });
});

describe("detectSourceType", () => {
  it("honors an explicit non-auto type", () => {
    expect(detectSourceType({ src: "https://cdn.example.com/file.mp4", type: "hls" })).toBe("hls");
    expect(detectSourceType({ src: "https://cdn.example.com/file.mp4", type: "native" })).toBe(
      "native",
    );
  });

  it("dispatches HLS / YouTube / progressive / native for auto", () => {
    expect(detectSourceType({ src: "https://cdn.example.com/master.m3u8" })).toBe("hls");
    expect(detectSourceType({ src: "https://youtube.com/watch?v=abc" })).toBe("youtube");
    expect(detectSourceType({ src: "https://cdn.example.com/file.mp4" })).toBe("mp4");
    expect(detectSourceType({ src: "blob:abc" })).toBe("mp4");
    expect(detectSourceType({ src: "https://cdn.example.com/file.unknown" })).toBe("native");
  });

  it("treats type='auto' the same as missing type", () => {
    expect(detectSourceType({ src: "https://cdn.example.com/master.m3u8", type: "auto" })).toBe(
      "hls",
    );
  });
});

describe("resolveWithCredentials", () => {
  it("returns the boolean value verbatim", () => {
    expect(resolveWithCredentials(true, "https://example.com")).toBe(true);
    expect(resolveWithCredentials(false, "https://example.com")).toBe(false);
  });

  it("calls the predicate with the URL", () => {
    const policy = (url: string): boolean => url.startsWith("https://api-gateway");
    expect(resolveWithCredentials(policy, "https://api-gateway.example.com/x")).toBe(true);
    expect(resolveWithCredentials(policy, "https://cdn.example.com/x")).toBe(false);
  });

  it("returns false for undefined policy", () => {
    expect(resolveWithCredentials(undefined, "https://example.com")).toBe(false);
  });

  it("swallows predicate exceptions and returns false", () => {
    const policy = (): boolean => {
      throw new Error("boom");
    };
    expect(resolveWithCredentials(policy, "https://example.com")).toBe(false);
  });
});

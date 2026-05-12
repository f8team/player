import { describe, expect, it } from "vitest";

import { findCueAt, parseSpriteVtt } from "../parseSpriteVtt.js";

describe("parseSpriteVtt", () => {
  it("returns [] for empty input", () => {
    expect(parseSpriteVtt("")).toEqual([]);
    expect(parseSpriteVtt("WEBVTT\n\n")).toEqual([]);
  });

  it("parses a single cue with #xywh fragment", () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:10.000
sprites/00001.jpg#xywh=0,0,160,90
`;
    const cues = parseSpriteVtt(vtt, "https://cdn.example.com/video/thumbs.vtt");
    expect(cues).toHaveLength(1);
    expect(cues[0]).toEqual({
      start: 0,
      end: 10,
      src: "https://cdn.example.com/video/sprites/00001.jpg",
      x: 0,
      y: 0,
      w: 160,
      h: 90,
    });
  });

  it("parses multiple cues and resolves relative URLs against baseUrl", () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:10.000
sprites/00001.jpg#xywh=0,0,160,90

00:00:10.000 --> 00:00:20.000
sprites/00001.jpg#xywh=160,0,160,90

00:00:20.000 --> 00:00:30.000
sprites/00001.jpg#xywh=320,0,160,90
`;
    const cues = parseSpriteVtt(vtt, "https://cdn.example.com/video/thumbs.vtt");
    expect(cues).toHaveLength(3);
    expect(cues[1]).toMatchObject({ start: 10, end: 20, x: 160 });
    expect(cues.every((c) => c.src === "https://cdn.example.com/video/sprites/00001.jpg")).toBe(
      true,
    );
  });

  it("preserves absolute URLs when cue body is fully qualified", () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
https://images.example.com/v/01.jpg#xywh=0,0,200,112
`;
    const cues = parseSpriteVtt(vtt, "https://cdn.example.com/video/thumbs.vtt");
    expect(cues[0]?.src).toBe("https://images.example.com/v/01.jpg");
  });

  it("treats cue without #xywh fragment as a 0/0/0/0 placeholder", () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
poster.jpg
`;
    const cues = parseSpriteVtt(vtt, "https://cdn.example.com/video/thumbs.vtt");
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ x: 0, y: 0, w: 0, h: 0 });
    expect(cues[0]?.src).toBe("https://cdn.example.com/video/poster.jpg");
  });

  it("supports the MM:SS short timestamp form", () => {
    const vtt = `WEBVTT

00:10.000 --> 00:20.500
sprites/01.jpg#xywh=0,0,160,90
`;
    const cues = parseSpriteVtt(vtt);
    expect(cues[0]).toMatchObject({ start: 10, end: 20.5 });
  });

  it("supports HH:MM:SS hour timestamps", () => {
    const vtt = `WEBVTT

01:00:00.000 --> 01:00:10.000
sprites/big.jpg#xywh=0,0,160,90
`;
    const cues = parseSpriteVtt(vtt);
    expect(cues[0]?.start).toBe(3600);
    expect(cues[0]?.end).toBe(3610);
  });

  it("ignores cue identifiers, NOTE blocks and blank lines", () => {
    const vtt = `WEBVTT

NOTE
This is a comment block
that spans multiple lines.

cue-1
00:00:00.000 --> 00:00:05.000
sprites/01.jpg#xywh=0,0,160,90

cue-2
00:00:05.000 --> 00:00:10.000
sprites/01.jpg#xywh=160,0,160,90
`;
    const cues = parseSpriteVtt(vtt, "https://cdn.example.com/v/thumbs.vtt");
    expect(cues).toHaveLength(2);
    expect(cues[1]).toMatchObject({ start: 5, end: 10, x: 160 });
  });

  it("skips malformed timestamps (end <= start) without crashing", () => {
    const vtt = `WEBVTT

00:00:10.000 --> 00:00:00.000
bad.jpg#xywh=0,0,160,90

00:00:00.000 --> 00:00:05.000
ok.jpg#xywh=0,0,160,90
`;
    const cues = parseSpriteVtt(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0]?.src).toBe("ok.jpg");
  });

  it("falls back to the raw URL when baseUrl is missing or invalid", () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprites/01.jpg#xywh=0,0,160,90
`;
    const cuesNoBase = parseSpriteVtt(vtt);
    expect(cuesNoBase[0]?.src).toBe("sprites/01.jpg");

    const cuesBadBase = parseSpriteVtt(vtt, "not a url");
    expect(cuesBadBase[0]?.src).toBe("sprites/01.jpg");
  });
});

describe("findCueAt", () => {
  const cues = parseSpriteVtt(
    `WEBVTT

00:00:00.000 --> 00:00:10.000
s.jpg#xywh=0,0,160,90

00:00:10.000 --> 00:00:20.000
s.jpg#xywh=160,0,160,90

00:00:20.000 --> 00:00:30.000
s.jpg#xywh=320,0,160,90
`,
  );

  it("returns the cue whose range covers the time", () => {
    expect(findCueAt(cues, 0)).toMatchObject({ start: 0, end: 10 });
    expect(findCueAt(cues, 9.999)).toMatchObject({ start: 0, end: 10 });
    expect(findCueAt(cues, 10)).toMatchObject({ start: 10, end: 20 });
    expect(findCueAt(cues, 25)).toMatchObject({ start: 20, end: 30 });
  });

  it("returns null when time is outside every cue", () => {
    expect(findCueAt(cues, -1)).toBeNull();
    expect(findCueAt(cues, 30)).toBeNull();
    expect(findCueAt(cues, 999)).toBeNull();
  });

  it("returns null when the cue list is empty or time is non-finite", () => {
    expect(findCueAt([], 5)).toBeNull();
    expect(findCueAt(cues, Number.NaN)).toBeNull();
    expect(findCueAt(cues, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

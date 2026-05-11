import { describe, expect, it } from "vitest";

import { formatTime, parseTime, toSeconds } from "./time.js";

describe("parseTime", () => {
  it("parses H:MM:SS", () => {
    expect(parseTime("0:00:00")).toBe(0);
    expect(parseTime("0:01:23")).toBe(83);
    expect(parseTime("1:02:03")).toBe(3723);
    expect(parseTime("12:34:56")).toBe(45_296);
  });

  it("parses M:SS", () => {
    expect(parseTime("0:00")).toBe(0);
    expect(parseTime("1:23")).toBe(83);
    expect(parseTime("59:59")).toBe(3599);
  });

  it("parses fractional seconds", () => {
    expect(parseTime("0:01.500")).toBe(1.5);
    expect(parseTime("0:01:23.250")).toBe(83.25);
  });

  it("trims whitespace", () => {
    expect(parseTime("  1:23  ")).toBe(83);
  });

  it("returns NaN on invalid input", () => {
    expect(parseTime("not a time")).toBeNaN();
    expect(parseTime("")).toBeNaN();
    // @ts-expect-error — runtime guard test
    expect(parseTime(undefined)).toBeNaN();
    // @ts-expect-error — runtime guard test
    expect(parseTime(123)).toBeNaN();
    expect(parseTime("99:99")).toBeNaN();
    expect(parseTime("1:99:99")).toBeNaN();
  });
});

describe("formatTime", () => {
  it("formats < 1h as M:SS", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(83)).toBe("1:23");
    expect(formatTime(3599)).toBe("59:59");
  });

  it("formats ≥ 1h as H:MM:SS", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3723)).toBe("1:02:03");
    expect(formatTime(45_296)).toBe("12:34:56");
  });

  it("rounds down (truncates)", () => {
    expect(formatTime(1.999)).toBe("0:01");
    expect(formatTime(83.5)).toBe("1:23");
  });

  it("handles 0 / NaN / negative / Infinity gracefully", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(Number.NaN)).toBe("0:00");
    expect(formatTime(-10)).toBe("0:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00");
  });
});

describe("toSeconds", () => {
  it("returns finite numbers as-is and clamps negatives to 0", () => {
    expect(toSeconds(0)).toBe(0);
    expect(toSeconds(12.5)).toBe(12.5);
    expect(toSeconds(-1)).toBe(0);
  });

  it("returns NaN for non-finite numbers", () => {
    expect(toSeconds(Number.NaN)).toBeNaN();
    expect(toSeconds(Number.POSITIVE_INFINITY)).toBeNaN();
  });

  it("parses time strings", () => {
    expect(toSeconds("1:23")).toBe(83);
    expect(toSeconds("0:00:01.500")).toBe(1.5);
  });

  it("returns NaN on invalid string", () => {
    expect(toSeconds("xx")).toBeNaN();
  });
});

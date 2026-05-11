import { describe, expect, it } from "vitest";

import { classifyHttpStatus, classifyMediaError, classifyUnknown } from "./classify.js";
import { createPlayerError } from "./registry.js";

describe("createPlayerError", () => {
  it("defaults retryable per code", () => {
    expect(createPlayerError({ code: "network", message: "x" }).retryable).toBe(true);
    expect(createPlayerError({ code: "decode", message: "x" }).retryable).toBe(false);
    expect(createPlayerError({ code: "unauthorized", message: "x" }).retryable).toBe(false);
  });

  it("explicit retryable overrides the default", () => {
    expect(createPlayerError({ code: "network", message: "x", retryable: false }).retryable).toBe(
      false,
    );
  });

  it("omits undefined optional fields", () => {
    const err = createPlayerError({ code: "internal", message: "x" });
    expect(err).not.toHaveProperty("cause");
    expect(err).not.toHaveProperty("status");
    expect(err).not.toHaveProperty("url");
  });

  it("includes optional fields when present", () => {
    const cause = new Error("boom");
    const err = createPlayerError({
      code: "network",
      message: "x",
      cause,
      status: 502,
      url: "https://x.com",
    });
    expect(err.cause).toBe(cause);
    expect(err.status).toBe(502);
    expect(err.url).toBe("https://x.com");
  });
});

describe("classifyMediaError", () => {
  it("MediaError code 1 → internal (aborted)", () => {
    const err = classifyMediaError({ code: 1, message: "abort" } as MediaError);
    expect(err.code).toBe("internal");
  });

  it("MediaError code 2 → network (retryable)", () => {
    const err = classifyMediaError({ code: 2, message: "net" } as MediaError);
    expect(err.code).toBe("network");
    expect(err.retryable).toBe(true);
  });

  it("MediaError code 3 → decode", () => {
    expect(classifyMediaError({ code: 3, message: "decode" } as MediaError).code).toBe("decode");
  });

  it("MediaError code 4 → unsupported", () => {
    expect(classifyMediaError({ code: 4, message: "unsup" } as MediaError).code).toBe(
      "unsupported",
    );
  });

  it("null/missing MediaError → internal with the default message", () => {
    expect(classifyMediaError(null).code).toBe("internal");
    expect(classifyMediaError(undefined).message).toBe("Media error");
  });

  it("preserves the URL", () => {
    expect(
      classifyMediaError({ code: 2, message: "x" } as MediaError, "https://cdn/file.mp4").url,
    ).toBe("https://cdn/file.mp4");
  });
});

describe("classifyHttpStatus", () => {
  it("401/403 → unauthorized", () => {
    expect(classifyHttpStatus(401, "u").code).toBe("unauthorized");
    expect(classifyHttpStatus(403, "u").code).toBe("unauthorized");
  });

  it("5xx → network retryable", () => {
    const err = classifyHttpStatus(503, "u");
    expect(err.code).toBe("network");
    expect(err.retryable).toBe(true);
  });

  it("4xx (other) → network non-retryable", () => {
    const err = classifyHttpStatus(404, "u");
    expect(err.code).toBe("network");
    expect(err.retryable).toBe(false);
  });

  it("3xx → network", () => {
    expect(classifyHttpStatus(301, "u").code).toBe("network");
  });

  it("preserves status + url", () => {
    const err = classifyHttpStatus(401, "https://x.com/seg.ts");
    expect(err.status).toBe(401);
    expect(err.url).toBe("https://x.com/seg.ts");
  });
});

describe("classifyUnknown", () => {
  it("Error instances become internal with cause", () => {
    const cause = new Error("kaboom");
    const err = classifyUnknown(cause);
    expect(err.code).toBe("internal");
    expect(err.message).toBe("kaboom");
    expect(err.cause).toBe(cause);
  });

  it("strings become internal with the string as message", () => {
    const err = classifyUnknown("oops");
    expect(err.message).toBe("oops");
  });

  it("everything else falls back to 'Unknown error'", () => {
    expect(classifyUnknown({ shape: "weird" }).message).toBe("Unknown error");
    expect(classifyUnknown(null).message).toBe("Unknown error");
  });

  it("Error with empty message uses fallback", () => {
    const err = classifyUnknown(new Error(""));
    expect(err.message).toBe("Unknown error");
  });
});

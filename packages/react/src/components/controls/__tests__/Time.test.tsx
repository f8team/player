import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Time } from "../Time.js";

describe("<Time>", () => {
  it("displays current time by default", () => {
    const { container } = renderWithPlayer(<Time />, {
      initialState: { currentTime: 65, duration: 300 },
    });
    // 65s = 1:05  (formatTime: no leading zero for minutes < 10 when no hours)
    expect(container.querySelector("time")?.textContent).toBe("1:05");
  });

  it("displays duration when variant='duration'", () => {
    const { container } = renderWithPlayer(<Time variant="duration" />, {
      initialState: { currentTime: 0, duration: 125 },
    });
    // 125s = 2:05
    expect(container.querySelector("time")?.textContent).toBe("2:05");
  });

  it("displays remaining time when variant='remaining'", () => {
    const { container } = renderWithPlayer(<Time variant="remaining" />, {
      initialState: { currentTime: 60, duration: 120 },
    });
    // remaining = 60s = 1:00
    expect(container.querySelector("time")?.textContent).toBe("1:00");
  });

  it("has aria-label describing the value", () => {
    const { container } = renderWithPlayer(<Time />, {
      initialState: { currentTime: 65, duration: 300 },
    });
    expect(container.querySelector("time")?.getAttribute("aria-label")).toContain("1:05");
  });

  it("updates when currentTime changes", () => {
    const { container, mockSetState } = renderWithPlayer(<Time />, {
      initialState: { currentTime: 0, duration: 100 },
    });
    act(() => mockSetState({ currentTime: 30 }));
    expect(container.querySelector("time")?.textContent).toBe("0:30");
  });
});

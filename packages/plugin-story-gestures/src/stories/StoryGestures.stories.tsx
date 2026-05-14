import { Root, Video } from "@f8team/reel-react";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { createStoryGesturesPlugin } from "../index.js";

const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function StoryGesturesDemo({ onPrev, onNext }: { onPrev?: () => void; onNext?: () => void }) {
  const plugins = [
    createStoryGesturesPlugin({
      onPrev: onPrev ?? (() => alert("← previous story")),
      onNext: onNext ?? (() => alert("→ next story")),
    }),
  ];

  return (
    <div>
      <div
        style={{
          width: "min(36rem, 90vw)",
          aspectRatio: "9/16",
          position: "relative",
          background: "#000",
          borderRadius: "1.2rem",
          overflow: "hidden",
        }}
        data-reel=""
        data-theme="story"
      >
        <Root options={{ source: { src: DEMO_MP4, tracks: [] }, plugins, playsInline: true }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <Video
              style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "cover", display: "block" }}
            />
          </div>
        </Root>
      </div>
      <p style={{ marginTop: "1.2rem", color: "#374151", fontSize: "1.3rem" }}>
        Swipe left → next story &bull; Swipe right → previous story &bull; Tap left/right thirds →
        seek &bull; Hold → pause
      </p>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Story Gestures",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createStoryGesturesPlugin` — story-reel swipe/tap interactions: " +
          "swipe left (next), swipe right (previous), tap left/right thirds (seek ±10s), hold (pause). " +
          "Fires `onNext` / `onPrev` callbacks for playlist navigation.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: "Story gestures (use touch device)",
  render: () => <StoryGesturesDemo />,
};

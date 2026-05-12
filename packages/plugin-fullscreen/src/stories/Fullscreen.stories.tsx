import { Root, Video, Controls } from "@f8/player-react";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { createFullscreenPlugin } from "../index.js";

const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function FullscreenDemo() {
  const plugins = [createFullscreenPlugin()];

  return (
    <div
      style={{
        width: "clamp(32rem, 80vw, 72rem)",
        aspectRatio: "16/9",
        position: "relative",
        background: "#000",
        borderRadius: "0.8rem",
        overflow: "hidden",
      }}
      data-f8-player=""
      data-theme="classroom"
    >
      <Root options={{ source: { src: DEMO_MP4, tracks: [] }, plugins, playsInline: true }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <Video
            style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }}
          />
          <Controls.Bar
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.8rem 1.2rem",
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            }}
          >
            <Controls.PlayPause />
            <Controls.SeekBar style={{ flex: 1 }} />
            <Controls.Time variant="current" />
            <Controls.Mute />
            <Controls.Fullscreen />
          </Controls.Bar>
        </div>
      </Root>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Fullscreen",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createFullscreenPlugin` — native Fullscreen API wrapper. " +
          "Wires the `Controls.Fullscreen` button and keyboard `F` shortcut (when paired with `keyboard` plugin).",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: "Fullscreen button",
  render: () => <FullscreenDemo />,
};

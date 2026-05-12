import { Root, Video, Controls } from "@f8/player-react";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { createWatermarkPlugin } from "../index.js";

const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function WatermarkDemo({
  position,
}: {
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";
}) {
  const plugins = [
    createWatermarkPlugin({
      text: "F8 Premium",
      className: `f8-watermark-${position}`,
    }),
  ];

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
      data-theme="admin"
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

const meta: Meta<{
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";
}> = {
  title: "Plugins/Watermark",
  tags: ["autodocs"],
  argTypes: {
    position: {
      control: "select",
      options: ["top-right", "top-left", "bottom-right", "bottom-left", "center"],
    },
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createWatermarkPlugin` — premium text or image overlay. Supports all four corners and center. " +
          "Opacity and font size are configurable. Phase 8 wires the license check.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TopRight: Story = {
  name: "Watermark (top-right)",
  args: { position: "top-right" },
  render: ({ position }) => <WatermarkDemo position={position} />,
};

export const Center: Story = {
  name: "Watermark (center)",
  args: { position: "center" },
  render: ({ position }) => <WatermarkDemo position={position} />,
};

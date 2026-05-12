import { Root, Video, Controls } from "@f8/player-react";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { createKeyboardPlugin } from "../index.js";

const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function KeyboardDemo() {
  const plugins = [
    createKeyboardPlugin({
      seekStep: 10,
    }),
  ];

  return (
    <div
      tabIndex={0}
      style={{
        outline: "none",
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
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem" }}>/</span>
            <Controls.Time variant="duration" />
            <Controls.Mute />
            <Controls.Volume style={{ width: "8rem" }} />
            <Controls.Fullscreen />
          </Controls.Bar>
        </div>
      </Root>
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: "0.8rem 1.2rem",
          borderRadius: "0.4rem",
          fontSize: "1.2rem",
          lineHeight: 1.6,
        }}
      >
        <strong>Keyboard shortcuts</strong>
        <br />
        Space — play / pause
        <br />
        ← / → — ±10 s<br />
        ↑ / ↓ — volume
        <br />
        F — fullscreen
        <br />M — mute
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Keyboard",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createKeyboardPlugin` — keyboard shortcuts scoped to the player container. " +
          "Supports Space (play/pause), Arrow keys (seek ±`seekStep`), " +
          "↑↓ (volume), M (mute), F (fullscreen).",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: "Keyboard shortcuts (click player first)",
  render: () => <KeyboardDemo />,
};

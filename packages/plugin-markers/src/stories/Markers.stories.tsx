import { Root, Video, Controls } from "@f8team/reel-react";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { createMarkersPlugin } from "../index.js";

const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const CHAPTER_MARKERS = [
  { time: 5, label: "Intro" },
  { time: 30, label: "Setup" },
  { time: 90, label: "Main content" },
  { time: 180, label: "Examples" },
  { time: 280, label: "Outro" },
];

function MarkersDemo() {
  const plugins = [
    createMarkersPlugin({
      markers: CHAPTER_MARKERS,
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
      data-reel=""
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
            <Controls.Fullscreen />
          </Controls.Bar>
        </div>
      </Root>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Markers",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createMarkersPlugin` — chapter/transcript markers on the seek bar. " +
          "Click a marker to seek directly. Markers can be updated at runtime via " +
          "`player.command('markers:setMarkers', [...])`. " +
          "Supports custom colours, border-radius, and tooltip text.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const ChapterMarkers: Story = {
  name: "Chapter markers (click to seek)",
  render: () => <MarkersDemo />,
};

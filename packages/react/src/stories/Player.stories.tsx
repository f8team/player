import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { Root, Video, Captions, Controls } from "../index.js";

// ─── Decorators ──────────────────────────────────────────────────────────────

/**
 * Wrap the player in a 16:9 container with the chosen theme.
 */
function PlayerShell({
  theme = "classroom",
  src,
  children,
}: {
  theme?: string;
  src: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "clamp(32rem, 80vw, 72rem)",
        aspectRatio: "16 / 9",
        position: "relative",
        overflow: "hidden",
        background: "#000",
        borderRadius: "0.8rem",
      }}
      data-f8-player=""
      data-theme={theme}
    >
      <Root
        options={{
          source: { src, tracks: [] },
          playsInline: true,
          crossOrigin: "anonymous",
        }}
      >
        {children}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <Video
            style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }}
          />
          <Captions />
          <Controls.Bar
            layout="two-row"
            style={{
              padding: "0.8rem 1.2rem",
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            }}
          >
            <Controls.TimelineRow style={{ gap: "0.6rem" }}>
              <Controls.Time variant="current" />
              <Controls.SeekBar style={{ flex: 1, minWidth: 0 }} />
              <Controls.Time variant="duration" />
            </Controls.TimelineRow>
            <Controls.ActionsRow style={{ alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <Controls.PlayPause />
              <Controls.Mute />
              <Controls.Volume style={{ width: "8rem" }} />
              <Controls.PlaybackRate />
              <Controls.Fullscreen />
            </Controls.ActionsRow>
          </Controls.Bar>
        </div>
      </Root>
    </div>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Player/Core",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`@f8/player-react` headless player. Compose `Root`, `Video`, `Captions`, and `Controls.*` to build any player UI.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// ─── Stories ──────────────────────────────────────────────────────────────────

const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const DEMO_YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

export const ClassroomTheme: Story = {
  name: "Classroom theme (HLS)",
  render: () => <PlayerShell theme="classroom" src={DEMO_HLS} />,
  parameters: {
    docs: {
      description: { story: "Default theme for course lessons. Orange accent, dark chrome." },
    },
  },
};

export const AdminTheme: Story = {
  name: "Admin theme (MP4)",
  render: () => <PlayerShell theme="admin" src={DEMO_MP4} />,
  parameters: {
    docs: {
      description: { story: "Admin upload preview theme. Neutral dark chrome, compact controls." },
    },
  },
};

export const StoryTheme: Story = {
  name: "Story theme (HLS)",
  render: () => <PlayerShell theme="story" src={DEMO_HLS} />,
  parameters: {
    docs: {
      description: { story: "Story/reel fullscreen theme. Large center play, minimal controls." },
    },
  },
};

export const MinimalTheme: Story = {
  name: "Minimal theme (MP4)",
  render: () => <PlayerShell theme="minimal" src={DEMO_MP4} />,
  parameters: {
    docs: {
      description: { story: "Minimal theme for embeds with no chrome. Controls appear on hover." },
    },
  },
};

export const YouTubeEmbed: Story = {
  name: "YouTube embed (no custom controls)",
  render: () => <PlayerShell theme="classroom" src={DEMO_YT} />,
  parameters: {
    docs: {
      description: {
        story:
          "When source is a YouTube URL the engine delegates to the YT IFrame API. " +
          "Custom controls are hidden automatically via `useSourceType()`.",
      },
    },
  },
};

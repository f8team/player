import { Root, Video, Controls } from "@f8team/reel-react";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";

import { createAuthAwarePlugin } from "../index.js";

// Use a public MP4 to simulate; auth-aware silently no-ops for non-allowlisted domains.
const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function AuthAwareDemo() {
  const [events, setEvents] = useState<string[]>([]);

  const plugins = [
    createAuthAwarePlugin({
      allowlist: ["https://api-gateway.f8.com"],
      onUnauthorized: () => {
        setEvents((prev) => [
          `[${new Date().toLocaleTimeString()}] onUnauthorized fired`,
          ...prev.slice(0, 4),
        ]);
      },
      pauseOnUnauthorized: true,
    }),
  ];

  return (
    <div>
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
        data-theme="minimal"
      >
        <Root options={{ source: { src: DEMO_MP4, tracks: [] }, plugins, playsInline: true }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <Video
              style={{
                flex: 1,
                width: "100%",
                minHeight: 0,
                objectFit: "contain",
                display: "block",
              }}
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
            </Controls.Bar>
          </div>
        </Root>
      </div>
      <div
        style={{
          marginTop: "1.2rem",
          background: "#111",
          color: "#aaa",
          fontFamily: "monospace",
          fontSize: "1.2rem",
          padding: "1.2rem",
          borderRadius: "0.6rem",
          minHeight: "6rem",
        }}
      >
        <div style={{ color: "#cbd5e1", marginBottom: "0.6rem" }}>
          Auth events (triggered by 401/403 on allowlisted domains):
        </div>
        {events.length === 0 ? (
          <span style={{ color: "#cbd5e1" }}>— no events yet —</span>
        ) : (
          events.map((e, i) => <div key={i}>{e}</div>)
        )}
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Auth Aware",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createAuthAwarePlugin` — intercepts 401/403 responses from allowlisted domains " +
          "(e.g. `https://api-gateway.f8.com`) and fires `onUnauthorized`. " +
          "Optionally pauses the player. Use to show a login prompt when a stream token expires.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: "Auth-aware (public stream demo)",
  render: () => <AuthAwareDemo />,
};

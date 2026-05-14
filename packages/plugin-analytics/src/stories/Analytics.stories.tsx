import { Root, Video, Controls } from "@f8team/reel-react";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useRef, useState } from "react";

import { createAnalyticsPlugin } from "../index.js";
import type { AnalyticsEvent } from "../index.js";

const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function AnalyticsDemo() {
  const [events, setEvents] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const plugins = [
    createAnalyticsPlugin({
      onEvent(event: AnalyticsEvent) {
        const line = `[${new Date().toLocaleTimeString()}] ${event.type}${
          "currentTime" in event
            ? ` @ ${(event as { currentTime: number }).currentTime.toFixed(1)}s`
            : ""
        }`;
        logRef.current = [line, ...logRef.current.slice(0, 9)];
        setEvents([...logRef.current]);
      },
    }),
  ];

  return (
    <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" }}>
      <div
        style={{
          width: "clamp(28rem, 60vw, 56rem)",
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
          minWidth: "22rem",
          background: "#111",
          color: "#0f0",
          fontFamily: "monospace",
          fontSize: "1.2rem",
          padding: "1.2rem",
          borderRadius: "0.6rem",
          maxHeight: "18rem",
          overflow: "auto",
        }}
      >
        <div style={{ color: "#cbd5e1", marginBottom: "0.8rem" }}>Analytics events:</div>
        {events.length === 0 && (
          <div style={{ color: "#cbd5e1" }}>— play the video to see events —</div>
        )}
        {events.map((e, i) => (
          <div key={i}>{e}</div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Analytics",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createAnalyticsPlugin` — fire analytics events (`play`, `pause`, `progress`, `ended`, `seek`, `error`) " +
          "through a `sink` callback. Framework-agnostic — connect to any analytics service.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const EventLog: Story = {
  name: "Analytics event log",
  render: () => <AnalyticsDemo />,
};

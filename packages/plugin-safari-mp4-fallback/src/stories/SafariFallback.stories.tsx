import type { Meta, StoryObj } from "@storybook/react";
import { Root, Video, Controls } from "@f8/player-react";
import { createSafariMp4FallbackPlugin } from "../index.js";

// Provide both HLS + MP4 URLs; the plugin picks MP4 on desktop Safari.
const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const DEMO_MP4 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function SafariFallbackDemo() {
  const plugins = [
    createSafariMp4FallbackPlugin({ mp4Url: DEMO_MP4 }),
  ];

  return (
    <div>
      <div style={{ width: "clamp(32rem, 80vw, 72rem)", aspectRatio: "16/9", position: "relative", background: "#000", borderRadius: "0.8rem", overflow: "hidden" }} data-f8-player="" data-theme="classroom">
        <Root options={{ source: { src: DEMO_HLS, tracks: [] }, plugins, playsInline: true }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }} />
            <Controls.Bar style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1.2rem", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
              <Controls.PlayPause />
              <Controls.SeekBar style={{ flex: 1 }} />
              <Controls.Time variant="current" />
              <Controls.Mute />
              <Controls.Fullscreen />
            </Controls.Bar>
          </div>
        </Root>
      </div>
      <p style={{ marginTop: "1.2rem", color: "#888", fontSize: "1.3rem" }}>
        On desktop Safari or for uploaded MP4-type videos, the plugin swaps the HLS source for a direct MP4 URL, bypassing hls.js.
      </p>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Safari MP4 Fallback",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createSafariMp4FallbackPlugin` — on desktop Safari (or when source type is `mp4`), " +
          "replaces the HLS URL with a direct progressive MP4 URL, bypassing hls.js entirely. " +
          "Ensures correct playback when hls.js is unavailable or unreliable.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: "Safari MP4 fallback",
  render: () => <SafariFallbackDemo />,
};

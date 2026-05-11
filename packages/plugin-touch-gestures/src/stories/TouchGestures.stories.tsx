import type { Meta, StoryObj } from "@storybook/react";
import { Root, Video, Controls } from "@f8/player-react";
import { createTouchGesturesPlugin } from "../index.js";

const DEMO_MP4 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function TouchGesturesDemo() {
  const plugins = [createTouchGesturesPlugin()];

  return (
    <div>
      <div style={{ width: "min(36rem, 90vw)", aspectRatio: "9/16", position: "relative", background: "#000", borderRadius: "1.2rem", overflow: "hidden" }} data-f8-player="" data-theme="story">
        <Root options={{ source: { src: DEMO_MP4, tracks: [] }, plugins, playsInline: true }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "cover", display: "block" }} />
            <Controls.Bar style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1.2rem", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
              <Controls.PlayPause />
              <Controls.SeekBar style={{ flex: 1 }} />
              <Controls.Time variant="current" />
              <Controls.Mute />
            </Controls.Bar>
          </div>
        </Root>
      </div>
      <p style={{ marginTop: "1.2rem", color: "#888", fontSize: "1.3rem" }}>
        On a touch device: <strong>single tap</strong> — show/hide controls &bull; <strong>double tap left/right</strong> — seek ±10s &bull; <strong>hold</strong> — pause
      </p>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Touch Gestures",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createTouchGesturesPlugin` — mobile touch interactions: " +
          "single tap (toggle controls), double-tap left/right (seek ±10s), long-press (pause). " +
          "Best paired with the Story or Minimal theme.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: "Touch gestures (use touch device)",
  render: () => <TouchGesturesDemo />,
};

import type { Meta, StoryObj } from "@storybook/react";
import { Root, Video, Controls } from "@f8/player-react";
import { createResumePositionPlugin } from "../index.js";

const DEMO_MP4 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function ResumeDemo() {
  const plugins = [
    createResumePositionPlugin({
      storageKey: "f8-player-storybook-resume",
      minResumeTime: 5,
    }),
  ];

  return (
    <div>
      <div style={{ width: "clamp(32rem, 80vw, 72rem)", aspectRatio: "16/9", position: "relative", background: "#000", borderRadius: "0.8rem", overflow: "hidden" }} data-f8-player="" data-theme="classroom">
        <Root options={{ source: { src: DEMO_MP4, tracks: [] }, plugins, playsInline: true }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }} />
            <Controls.Bar style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1.2rem", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
              <Controls.PlayPause />
              <Controls.SeekBar style={{ flex: 1 }} />
              <Controls.Time variant="current" />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem" }}>/</span>
              <Controls.Time variant="duration" />
              <Controls.Mute />
            </Controls.Bar>
          </div>
        </Root>
      </div>
      <p style={{ marginTop: "1.2rem", color: "#888", fontSize: "1.3rem" }}>
        Play, seek to at least 5s, then reload the story — the player will resume from where you left off.
      </p>
    </div>
  );
}

const meta: Meta = {
  title: "Plugins/Resume Position",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createResumePositionPlugin` — saves the playback position in `localStorage` and " +
          "resumes from the stored time on the next attach. Configurable `minResumeTime` threshold.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: "Resume position (play then reload)",
  render: () => <ResumeDemo />,
};

import type { Meta, StoryObj } from "@storybook/react";
import { Root, Video, Captions, Controls } from "@f8/player-react";
import { createSubtitlesPlugin } from "../index.js";

const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

function SubtitlesDemo() {
  const plugins = [
    createSubtitlesPlugin({
      tracks: [
        {
          src: "https://www.w3schools.com/tags/track_captions.vtt",
          srcLang: "en",
          label: "English",
          default: true,
        },
      ],
      autoActivate: true,
    }),
  ];

  return (
    <div
      style={{ width: "clamp(32rem, 80vw, 72rem)", aspectRatio: "16/9", position: "relative", background: "#000", borderRadius: "0.8rem", overflow: "hidden" }}
      data-f8-player=""
      data-theme="classroom"
    >
      <Root options={{ source: { src: DEMO_HLS, tracks: [] }, plugins, playsInline: true }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }} />
          <Captions />
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
  );
}

const meta: Meta = {
  title: "Plugins/Subtitles",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`createSubtitlesPlugin` — VTT multi-language captions. " +
          "Renders `<track>` elements and exposes a language selector. " +
          "Use `<Captions />` to display the active track.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const WithEnglishCaptions: Story = {
  name: "English captions (auto-activate)",
  render: () => <SubtitlesDemo />,
};

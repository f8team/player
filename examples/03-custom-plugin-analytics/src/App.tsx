import "@f8team/reel-themes/minimal.css";

import { definePlugin, type PluginInstance } from "@f8team/reel-core";
import { createReelWebPlayerPlugins, vietnameseLabels } from "@f8team/reel-preset-web";
import { Controls, Root, Video } from "@f8team/reel-react";
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

const SOURCE = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function createAnalyticsPlugin(push: (message: string) => void): PluginInstance {
  return definePlugin({
    name: "example-analytics",
    setup(player) {
      const offPlay = player.on("play", () => push("play"));
      const offPause = player.on("pause", () => push("pause"));
      const offTime = player.on("timeupdate", ({ currentTime }) => {
        if (Math.round(currentTime) % 5 === 0) push(`time:${Math.round(currentTime)}s`);
      });
      return () => {
        offPlay();
        offPause();
        offTime();
      };
    },
  });
}

function App(): JSX.Element {
  const [events, setEvents] = useState<string[]>([]);
  const plugins = useMemo(
    () => [
      ...createReelWebPlayerPlugins({ auth: false, subtitles: false, thumbnails: false }),
      createAnalyticsPlugin((event) => setEvents((prev) => [event, ...prev].slice(0, 6))),
    ],
    [],
  );

  return (
    <main className="page">
      <section>
        <p className="eyebrow">Example 03</p>
        <h1>Custom analytics plugin</h1>
      </section>
      <Root options={{ plugins }} source={{ src: SOURCE, type: "mp4" }} labels={vietnameseLabels}>
        <div className="player">
          <Video />
          <Controls.Bar>
            <Controls.TimelineRow>
              <Controls.Time variant="current" />
              <Controls.SeekBar />
              <Controls.Time variant="duration" />
            </Controls.TimelineRow>
            <Controls.ActionsRow>
              <Controls.PlayPause />
              <Controls.Mute />
              <Controls.Volume />
              <Controls.Fullscreen />
            </Controls.ActionsRow>
          </Controls.Bar>
        </div>
      </Root>
      <pre>{events.length ? events.join("\n") : "Chưa có sự kiện"}</pre>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);

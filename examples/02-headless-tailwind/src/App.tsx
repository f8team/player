import "@f8team/reel-themes/headless.css";

import { createReelWebPlayerPlugins, vietnameseLabels } from "@f8team/reel-preset-web";
import { Captions, Controls, Root, Spinner, Video } from "@f8team/reel-react";
import { createRoot } from "react-dom/client";

import "./styles.css";

const SOURCE = {
  src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  type: "mp4" as const,
};

const plugins = createReelWebPlayerPlugins({
  auth: false,
  keyboard: { scope: "container" },
  subtitles: false,
  thumbnails: false,
});

function App(): JSX.Element {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <p className="text-sky-300">Example 02</p>
        <h1 className="text-4xl font-bold">Headless + utility CSS</h1>
        <Root options={{ plugins }} source={SOURCE} labels={vietnameseLabels}>
          <div className="mt-6 overflow-hidden rounded-3xl bg-black shadow-2xl">
            <Video className="aspect-video w-full" />
            <Captions />
            <Spinner />
            <Controls.Bar className="space-y-3 bg-black/70 p-4 backdrop-blur" layout="two-row">
              <Controls.TimelineRow className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <Controls.Time className="tabular-nums text-slate-300" variant="current" />
                <Controls.SeekBar />
                <Controls.Time className="tabular-nums text-slate-300" variant="duration" />
              </Controls.TimelineRow>
              <Controls.ActionsRow className="flex items-center justify-center gap-2">
                <Controls.SeekOffset seconds={-5} />
                <Controls.PlayPause />
                <Controls.SeekOffset seconds={5} />
                <Controls.Mute />
                <Controls.Volume />
                <Controls.Settings />
                <Controls.Fullscreen />
              </Controls.ActionsRow>
            </Controls.Bar>
          </div>
        </Root>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);

import "@f8team/reel-themes/classroom.css";

import { ReelWebPlayer } from "@f8team/reel-preset-web";
import { createRoot } from "react-dom/client";

import "./styles.css";

const SOURCE = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function App(): JSX.Element {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Example 01</p>
        <h1>Classroom one-liner</h1>
        <p>
          Ship the F8 default player with Vietnamese labels, prefs, keyboard, spinner, and classroom
          controls from one component.
        </p>
      </section>

      <ReelWebPlayer
        className="player"
        src={SOURCE}
        poster="https://interactive-examples.mdn.mozilla.net/media/examples/flower.jpg"
        light
        plugins={{ prefs: { storageKey: "reel-player:example:classroom" } }}
      />
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);

import "@f8/player-themes/classroom.css";

import { F8WebPlayer } from "@f8/player-preset-web";
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

      <F8WebPlayer
        className="player"
        src={SOURCE}
        poster="https://interactive-examples.mdn.mozilla.net/media/examples/flower.jpg"
        light
        plugins={{ prefs: { storageKey: "f8-player:example:classroom" } }}
      />
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);

import { Sandpack } from "@codesandbox/sandpack-react";
import { useState } from "react";

const RECIPES: Record<string, { label: string; code: string }> = {
  basic: {
    label: "Basic player",
    code: `import { Root, Video, Controls } from "@f8/player-react";

const HLS_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export default function App() {
  return (
    <div
      data-f8-player=""
      data-theme="classroom"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        overflow: "hidden",
        background: "#000",
        borderRadius: "0.8rem",
      }}
    >
      <Root options={{ source: { src: HLS_URL }, playsInline: true }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }} />
          <Controls.Bar style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1.2rem", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
            <Controls.PlayPause />
            <Controls.SeekBar style={{ flex: 1 }} />
            <Controls.Time variant="current" />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem" }}>/</span>
            <Controls.Time variant="duration" />
            <Controls.Mute />
            <Controls.Volume style={{ width: "8rem" }} />
            <Controls.PlaybackRate />
            <Controls.Fullscreen />
          </Controls.Bar>
        </div>
      </Root>
    </div>
  );
}`,
  },
  withPlugins: {
    label: "With plugins",
    code: `import { useMemo } from "react";
import { Root, Video, Controls } from "@f8/player-react";
import { createKeyboardPlugin } from "@f8/player-plugin-keyboard";
import { createMarkersPlugin } from "@f8/player-plugin-markers";
import { createHlsQualityPlugin } from "@f8/player-plugin-hls-quality";

const HLS_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const MARKERS = [
  { time: 5,  label: "Intro" },
  { time: 30, label: "Content" },
  { time: 90, label: "Outro" },
];

export default function App() {
  const plugins = useMemo(() => [
    createKeyboardPlugin({ seekStep: 10 }),
    createMarkersPlugin({ markers: MARKERS, markerStyle: { backgroundColor: "#f05123" } }),
    createHlsQualityPlugin(),
  ], []);

  return (
    <div
      data-f8-player=""
      data-theme="classroom"
      style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#000", borderRadius: "0.8rem" }}
    >
      <Root options={{ source: { src: HLS_URL }, plugins, playsInline: true }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }} />
          <Controls.Bar style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1.2rem", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
            <Controls.PlayPause />
            <Controls.SeekBar style={{ flex: 1 }} />
            <Controls.Time variant="current" />
            <Controls.Mute />
            <Controls.Quality />
            <Controls.Fullscreen />
          </Controls.Bar>
        </div>
      </Root>
    </div>
  );
}`,
  },
  youtube: {
    label: "YouTube embed",
    code: `import { Root, Video, useSourceType } from "@f8/player-react";

const YT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

function PlayerInner() {
  const sourceType = useSourceType();
  const isYoutube = sourceType === "youtube";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Video style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      {isYoutube && (
        <div style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(0,0,0,0.7)", color: "#fff", padding: "0.6rem 1rem", borderRadius: "0.4rem", fontSize: "1.2rem" }}>
          YouTube native controls active
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div
      data-f8-player=""
      data-theme="minimal"
      style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#000", borderRadius: "0.8rem" }}
    >
      <Root options={{ source: { src: YT_URL }, playsInline: true }}>
        <PlayerInner />
      </Root>
    </div>
  );
}`,
  },
  analytics: {
    label: "Analytics",
    code: `import { useMemo, useState } from "react";
import { Root, Video, Controls } from "@f8/player-react";
import { createAnalyticsPlugin } from "@f8/player-plugin-analytics";

const MP4_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function App() {
  const [log, setLog] = useState([]);

  const plugins = useMemo(() => [
    createAnalyticsPlugin({
      sink(event) {
        const msg = \`[\${new Date().toLocaleTimeString()}] \${event.type}\`;
        setLog((prev) => [msg, ...prev.slice(0, 7)]);
      },
    }),
  ], []);

  return (
    <div style={{ display: "flex", gap: "1.6rem", flexWrap: "wrap" }}>
      <div data-f8-player="" data-theme="admin" style={{ position: "relative", width: "50rem", aspectRatio: "16/9", overflow: "hidden", background: "#000", borderRadius: "0.8rem" }}>
        <Root options={{ source: { src: MP4_URL }, plugins, playsInline: true }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }} />
            <Controls.Bar style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1.2rem", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
              <Controls.PlayPause />
              <Controls.SeekBar style={{ flex: 1 }} />
              <Controls.Mute />
            </Controls.Bar>
          </div>
        </Root>
      </div>
      <div style={{ background: "#111", color: "#0f0", fontFamily: "monospace", fontSize: "1.2rem", padding: "1.2rem", borderRadius: "0.6rem", minWidth: "24rem" }}>
        {log.length === 0 ? "— play to see events —" : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}`,
  },
};

const SANDPACK_DEPS = {
  "@f8/player-react": "latest",
  "@f8/player-core": "latest",
  "@f8/player-themes": "latest",
  "@f8/player-plugin-keyboard": "latest",
  "@f8/player-plugin-markers": "latest",
  "@f8/player-plugin-hls-quality": "latest",
  "@f8/player-plugin-analytics": "latest",
};

export default function PlaygroundPage() {
  const [recipe, setRecipe] = useState<keyof typeof RECIPES>("basic");
  const current = RECIPES[recipe];

  return (
    <article className="prose">
      <h1>Playground</h1>
      <p>Chỉnh sửa code trực tiếp. Tất cả packages đã được cài sẵn trong sandbox.</p>

      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {(Object.entries(RECIPES) as [keyof typeof RECIPES, { label: string }][]).map(
          ([key, { label }]) => (
            <button
              key={key}
              onClick={() => setRecipe(key)}
              style={{
                padding: "0.6rem 1.4rem",
                borderRadius: "2rem",
                border: recipe === key ? "none" : "1px solid #e5e7eb",
                background: recipe === key ? "#f05123" : "#fff",
                color: recipe === key ? "#fff" : "#374151",
                fontSize: "1.4rem",
                cursor: "pointer",
                fontWeight: recipe === key ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ),
        )}
      </div>

      <div className="playground-wrapper">
        <Sandpack
          key={recipe}
          template="react-ts"
          files={{
            "/App.tsx": current.code,
          }}
          customSetup={{
            dependencies: SANDPACK_DEPS,
          }}
          options={{
            showNavigator: false,
            showLineNumbers: true,
            showInlineErrors: true,
            editorHeight: 480,
          }}
          theme="dark"
        />
      </div>
    </article>
  );
}

export default function MigrationVideoJsPage() {
  return (
    <article className="prose">
      <h1>Migration từ video.js</h1>
      <p>
        Hướng dẫn chuyển từ <code>video.js</code> (+ các plugin videojs-*) sang{" "}
        <code>@f8/player-react</code>. Video.js là thư viện trưởng thành với UI mặc định;
        <code>@f8/player-react</code> headless hơn nhưng linh hoạt hơn và bundle nhỏ hơn nhiều.
      </p>

      <h2>So sánh bundle</h2>
      <table>
        <thead><tr><th></th><th>video.js + plugins</th><th>@f8/player-react</th></tr></thead>
        <tbody>
          <tr><td>Core</td><td>~470 kB gzip</td><td>~18 kB gzip</td></tr>
          <tr><td>HLS</td><td>+hls.js ~93 kB</td><td>+hls.js ~93 kB (shared)</td></tr>
          <tr><td>Quality plugin</td><td>~8 kB</td><td>0.28 kB</td></tr>
          <tr><td>Markers plugin</td><td>~12 kB</td><td>0.35 kB</td></tr>
          <tr><td>Keyboard</td><td>~5 kB</td><td>0.64 kB</td></tr>
          <tr><td>React wrapper</td><td>+react-video-js-player ~15 kB</td><td>included</td></tr>
        </tbody>
      </table>

      <h2>Cài đặt</h2>
      <pre><code>{`# Gỡ video.js và các plugin
pnpm remove video.js videojs-contrib-quality-levels videojs-hls-quality-selector \
  videojs-hotkeys videojs-markers videojs-playbackrate-adjuster

# Cài packages mới
pnpm add @f8/player-react @f8/player-core @f8/player-themes
pnpm add @f8/player-plugin-keyboard @f8/player-plugin-hls-quality @f8/player-plugin-markers`}</code></pre>

      <h2>Render cơ bản</h2>
      <p><strong>Trước (video.js + React):</strong></p>
      <pre><code>{`import videojs from "video.js";
import "video.js/dist/video-js.css";
import { useEffect, useRef } from "react";

function VideoPlayer({ src }) {
  const ref = useRef(null);
  
  useEffect(() => {
    const player = videojs(ref.current, {
      sources: [{ src, type: "application/x-mpegURL" }],
      controls: true,
      fluid: true,
    });
    return () => player.dispose();
  }, []);

  return (
    <div data-vjs-player>
      <video ref={ref} className="video-js vjs-default-skin" />
    </div>
  );
}`}</code></pre>

      <p><strong>Sau (@f8/player-react):</strong></p>
      <pre><code>{`import { Root, Video, Controls } from "@f8/player-react";
import "@f8/player-themes/classroom.css";

function VideoPlayer({ src }) {
  return (
    <div data-f8-player="" data-theme="classroom"
         style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#000" }}>
      <Root options={{ source: { src }, playsInline: true }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }} />
          <Controls.Bar style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1.2rem", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
            <Controls.PlayPause />
            <Controls.SeekBar style={{ flex: 1 }} />
            <Controls.Time variant="current" />
            <Controls.Mute />
            <Controls.PlaybackRate />
            <Controls.Fullscreen />
          </Controls.Bar>
        </div>
      </Root>
    </div>
  );
}`}</code></pre>

      <h2>Migration plugins</h2>
      <table>
        <thead><tr><th>video.js plugin</th><th>@f8/player equivalent</th></tr></thead>
        <tbody>
          <tr><td><code>videojs-hls-quality-selector</code> + <code>videojs-contrib-quality-levels</code></td><td><code>createHlsQualityPlugin()</code> + <code>Controls.Quality</code></td></tr>
          <tr><td><code>videojs-hotkeys</code></td><td><code>createKeyboardPlugin()</code></td></tr>
          <tr><td><code>videojs-markers</code></td><td><code>createMarkersPlugin()</code></td></tr>
          <tr><td><code>videojs-playbackrate-adjuster</code></td><td><code>Controls.PlaybackRate</code> (built-in)</td></tr>
          <tr><td><code>videojs-seek-buttons</code></td><td>dùng <code>usePlayer().seekTo()</code> với custom buttons</td></tr>
          <tr><td><code>videojs-youtube</code></td><td>tự động — detect YouTube URL</td></tr>
          <tr><td><code>videojs-contrib-eme</code></td><td>Phase 8 — DRM plugin (roadmap)</td></tr>
        </tbody>
      </table>

      <h2>Markers: từ videojs-markers</h2>
      <p><strong>Trước:</strong></p>
      <pre><code>{`player.markers({
  markers: [
    { time: 9.5,  text: "Intro" },
    { time: 16,   text: "Chapter 1" },
    { time: 23.6, text: "Chapter 2" },
  ],
});`}</code></pre>

      <p><strong>Sau:</strong></p>
      <pre><code>{`import { createMarkersPlugin } from "@f8/player-plugin-markers";

const plugins = useMemo(() => [
  createMarkersPlugin({
    markers: [
      { time: 9.5,  label: "Intro" },
      { time: 16,   label: "Chapter 1" },
      { time: 23.6, label: "Chapter 2" },
    ],
  }),
], []);

// Runtime update:
player.command("markers:setMarkers", newMarkers);`}</code></pre>

      <h2>Imperative API</h2>
      <table>
        <thead><tr><th>video.js</th><th>@f8/player-react</th></tr></thead>
        <tbody>
          <tr><td><code>player.play()</code></td><td><code>usePlayer().play()</code></td></tr>
          <tr><td><code>player.pause()</code></td><td><code>usePlayer().pause()</code></td></tr>
          <tr><td><code>player.currentTime(30)</code></td><td><code>usePlayer().seekTo(30)</code></td></tr>
          <tr><td><code>player.volume(0.5)</code></td><td><code>usePlayer().setVolume(0.5)</code></td></tr>
          <tr><td><code>player.muted(true)</code></td><td><code>usePlayer().setMuted(true)</code></td></tr>
          <tr><td><code>player.playbackRate(1.5)</code></td><td><code>usePlayer().setPlaybackRate(1.5)</code></td></tr>
          <tr><td><code>player.src({ src, type })</code></td><td><code>Root options.source.src = newSrc</code></td></tr>
          <tr><td><code>player.dispose()</code></td><td>tự động cleanup khi Root unmounts</td></tr>
        </tbody>
      </table>

      <h2>Checklist migrate</h2>
      <ul>
        <li><input type="checkbox" readOnly /> Gỡ <code>video.js</code> và tất cả <code>videojs-*</code> plugins</li>
        <li><input type="checkbox" readOnly /> Gỡ import <code>video-js.css</code></li>
        <li><input type="checkbox" readOnly /> Cài <code>@f8/player-react</code>, <code>@f8/player-core</code>, <code>@f8/player-themes</code></li>
        <li><input type="checkbox" readOnly /> Cài các plugin tương đương cần dùng</li>
        <li><input type="checkbox" readOnly /> Thay <code>&lt;video className="video-js" /&gt;</code> bằng <code>&lt;Root&gt;&lt;Video /&gt;&lt;/Root&gt;</code></li>
        <li><input type="checkbox" readOnly /> Compose Controls layout (headless)</li>
        <li><input type="checkbox" readOnly /> Migrate markers sang <code>createMarkersPlugin()</code></li>
        <li><input type="checkbox" readOnly /> Migrate keyboard sang <code>createKeyboardPlugin()</code></li>
        <li><input type="checkbox" readOnly /> Migrate quality selector sang <code>createHlsQualityPlugin()</code> + <code>Controls.Quality</code></li>
        <li><input type="checkbox" readOnly /> Xoá <code>player.dispose()</code> call thủ công (tự động)</li>
        <li><input type="checkbox" readOnly /> Test tất cả use cases</li>
      </ul>
    </article>
  );
}

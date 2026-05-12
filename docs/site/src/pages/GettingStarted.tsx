export default function GettingStartedPage() {
  return (
    <article className="prose">
      <h1>Hướng dẫn cài đặt</h1>

      <h2>Yêu cầu</h2>
      <ul>
        <li>React ≥ 18</li>
        <li>Node ≥ 20</li>
        <li>pnpm ≥ 9 (hoặc npm/yarn)</li>
      </ul>

      <h2>Cài đặt</h2>
      <pre>
        <code>{`pnpm add @f8/player-react @f8/player-core

# Nếu cần theme sẵn
pnpm add @f8/player-themes

# Plugins tuỳ chọn (chỉ cài những gì bạn dùng)
pnpm add @f8/player-plugin-subtitles
pnpm add @f8/player-plugin-keyboard
pnpm add @f8/player-plugin-hls-quality
pnpm add @f8/player-plugin-markers
pnpm add @f8/player-plugin-analytics
# ... v.v.`}</code>
      </pre>

      <h2>Player cơ bản</h2>
      <p>
        <code>@f8/player-react</code> cung cấp các primitive: <code>Root</code>, <code>Video</code>,
        <code>Captions</code> và namespace <code>Controls.*</code>. Bạn tự compose layout.
      </p>
      <pre>
        <code>{`import { Root, Video, Controls } from "@f8/player-react";
import "@f8/player-themes/classroom.css";

function MyPlayer() {
  return (
    <div
      data-f8-player=""
      data-theme="classroom"
      style={{
        position: "relative",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        background: "#000",
        borderRadius: "0.8rem",
      }}
    >
      <Root
        options={{
          source: { src: "https://example.com/stream.m3u8", tracks: [] },
          playsInline: true,
        }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
          <Video style={{ flex: 1, width: "100%", minHeight: 0, display: "block", objectFit: "contain" }} />
          <Captions />
          <Controls.Bar>
            <Controls.PlayPause />
            <Controls.SeekBar style={{ flex: 1 }} />
            <Controls.Time variant="current" />
            <Controls.Mute />
            <Controls.Volume style={{ width: "8rem" }} />
            <Controls.PlaybackRate />
            <Controls.Fullscreen />
          </Controls.Bar>
        </div>
      </Root>
    </div>
  );
}`}</code>
      </pre>

      <h2>Thêm plugins</h2>
      <p>
        Truyền mảng <code>plugins</code> vào <code>options</code> của <code>Root</code>. Plugins
        được khởi tạo một lần, không re-create khi component re-render.
      </p>
      <pre>
        <code>{`import { useMemo } from "react";
import { createKeyboardPlugin } from "@f8/player-plugin-keyboard";
import { createHlsQualityPlugin } from "@f8/player-plugin-hls-quality";
import { createSubtitlesPlugin } from "@f8/player-plugin-subtitles";

function MyPlayer() {
  const plugins = useMemo(() => [
    createKeyboardPlugin({ seekStep: 10 }),
    createHlsQualityPlugin(),
    createSubtitlesPlugin({
      tracks: [
        { src: "/subs/vi.vtt", srcLang: "vi", label: "Tiếng Việt", default: true },
        { src: "/subs/en.vtt", srcLang: "en", label: "English" },
      ],
    }),
  ], []);

  return (
    <Root options={{ source: { src: "...", tracks: [] }, plugins }}>
      {/* ... */}
    </Root>
  );
}`}</code>
      </pre>

      <h2>Imperative handle</h2>
      <p>
        Dùng <code>useRef</code> và <code>PlayerHandle</code> để điều khiển player từ bên ngoài:
      </p>
      <pre>
        <code>{`import { useRef } from "react";
import { usePlayer } from "@f8/player-react";

// Bên trong Root:
function ExternalControls() {
  const player = usePlayer();
  return (
    <button onClick={() => player.seekTo(30)}>Seek to 30s</button>
  );
}`}</code>
      </pre>

      <h2>YouTube</h2>
      <p>
        Truyền URL YouTube bình thường — engine tự nhận dạng và dùng YT IFrame API. Controls tuỳ
        chỉnh tự ẩn khi source là YouTube (dùng <code>useSourceType()</code>).
      </p>
      <pre>
        <code>{`<Root options={{ source: { src: "https://youtube.com/watch?v=..." } }}>
  {/* Controls sẽ không hiển thị với YouTube source */}
</Root>`}</code>
      </pre>

      <h2>Chủ đề (Themes)</h2>
      <p>
        Import CSS theme và thêm <code>data-theme</code> vào wrapper element:
      </p>
      <pre>
        <code>{`import "@f8/player-themes/classroom.css";
// hoặc: story.css | admin.css | minimal.css

<div data-f8-player="" data-theme="classroom">
  <Root ...>...</Root>
</div>`}</code>
      </pre>

      <p>Override token bất kỳ:</p>
      <pre>
        <code>{`[data-f8-player][data-theme="classroom"] {
  --f8p-accent: #6366f1; /* đổi màu nhấn */
  --f8p-bg: #050505;
}`}</code>
      </pre>
    </article>
  );
}

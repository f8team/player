export default function MigrationReactPlayerPage() {
  return (
    <article className="prose">
      <h1>Migration từ react-player</h1>
      <p>
        Hướng dẫn chuyển từ <code>react-player</code> sang <code>@f8/player-react</code>. Hai
        package có API tương đối khác nhau do <code>@f8/player-react</code> là headless (không có UI
        mặc định), nhưng việc migrate từng bước là khả thi.
      </p>

      <h2>Cài đặt</h2>
      <pre>
        <code>{`# Gỡ react-player
pnpm remove react-player

# Cài package mới
pnpm add @f8/player-react @f8/player-core @f8/player-themes`}</code>
      </pre>

      <h2>So sánh API</h2>

      <h3>Render cơ bản</h3>
      <p>
        <strong>Trước (react-player):</strong>
      </p>
      <pre>
        <code>{`import ReactPlayer from "react-player";

<ReactPlayer
  url="https://example.com/video.mp4"
  controls
  width="100%"
  height="auto"
  playing={isPlaying}
  onProgress={({ playedSeconds }) => handleProgress(playedSeconds)}
  onPlay={() => setIsPlaying(true)}
  onPause={() => setIsPlaying(false)}
/>`}</code>
      </pre>

      <p>
        <strong>Sau (@f8/player-react):</strong>
      </p>
      <pre>
        <code>{`import { Root, Video, Controls } from "@f8/player-react";
import "@f8/player-themes/classroom.css";

<div data-f8-player="" data-theme="classroom"
     style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
  <Root
    options={{ source: { src: "https://example.com/video.mp4" } }}
    onReady={() => {/* khi sẵn sàng */}}
  >
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <Video style={{ flex: 1, width: "100%", minHeight: 0, objectFit: "contain", display: "block" }} />
      <Controls.Bar>
        <Controls.PlayPause />
        <Controls.SeekBar style={{ flex: 1 }} />
        <Controls.Time variant="current" />
        <Controls.Mute />
        <Controls.Fullscreen />
      </Controls.Bar>
    </div>
    <ProgressBridge onProgress={handleProgress} />
  </Root>
</div>

// Bridge component để lắng nghe events:
function ProgressBridge({ onProgress }) {
  usePlayerEvent("timeupdate", ({ currentTime }) => onProgress(currentTime));
  return null;
}`}</code>
      </pre>

      <h2>Điều khiển bên ngoài</h2>
      <p>
        <strong>Trước:</strong>
      </p>
      <pre>
        <code>{`const playerRef = useRef(null);

// Seek
playerRef.current.seekTo(30, "seconds");

// Play/Pause
setIsPlaying(true);`}</code>
      </pre>

      <p>
        <strong>Sau:</strong>
      </p>
      <pre>
        <code>{`// Bên trong Root, dùng hook
function Controls() {
  const player = usePlayer();
  
  const handleSeek = () => player.seekTo(30);
  const handlePlay = () => player.play();
  
  return <button onClick={handleSeek}>Seek 30s</button>;
}

// Hoặc dùng ref bên ngoài với PlayerComponent:
import { PlayerComponent } from "@f8/player-react";
const ref = useRef(null);
<PlayerComponent ref={ref} src="..." />;
ref.current?.seekTo(30);`}</code>
      </pre>

      <h2>YouTube</h2>
      <p>
        <code>@f8/player-react</code> tự detect YouTube URL — không cần config thêm. Controls tuỳ
        chỉnh tự ẩn khi source là YouTube.
      </p>
      <pre>
        <code>{`// react-player:
<ReactPlayer url="https://youtube.com/watch?v=..." />

// @f8/player-react — giống hệt:
<Root options={{ source: { src: "https://youtube.com/watch?v=..." } }}>
  <Video />
  {/* Controls sẽ không hiển thị với YouTube */}
</Root>`}</code>
      </pre>

      <h2>Events</h2>
      <table>
        <thead>
          <tr>
            <th>react-player</th>
            <th>@f8/player-react</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>onPlay</code>
            </td>
            <td>
              <code>usePlayerEvent("play", ...)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>onPause</code>
            </td>
            <td>
              <code>usePlayerEvent("pause", ...)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>onProgress</code>
            </td>
            <td>
              <code>usePlayerEvent("timeupdate", ...)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>onEnded</code>
            </td>
            <td>
              <code>usePlayerEvent("ended", ...)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>onSeek</code>
            </td>
            <td>
              <code>usePlayerEvent("seeked", ...)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>onError</code>
            </td>
            <td>
              <code>usePlayerEvent("error", ...)</code> hoặc <code>Root.onError</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>onDuration</code>
            </td>
            <td>
              <code>usePlayerEvent("durationchange", ...)</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>onReady</code>
            </td>
            <td>
              <code>Root.onReady</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Checklist migrate</h2>
      <ul>
        <li>
          <input type="checkbox" readOnly /> Gỡ <code>react-player</code> khỏi{" "}
          <code>package.json</code>
        </li>
        <li>
          <input type="checkbox" readOnly /> Cài <code>@f8/player-react</code> +{" "}
          <code>@f8/player-core</code>
        </li>
        <li>
          <input type="checkbox" readOnly /> Thay <code>&lt;ReactPlayer /&gt;</code> bằng{" "}
          <code>&lt;Root&gt;&lt;Video /&gt;&lt;/Root&gt;</code>
        </li>
        <li>
          <input type="checkbox" readOnly /> Thêm Controls layout (headless — tự compose)
        </li>
        <li>
          <input type="checkbox" readOnly /> Chuyển <code>onProgress</code> sang{" "}
          <code>usePlayerEvent("timeupdate", ...)</code>
        </li>
        <li>
          <input type="checkbox" readOnly /> Chuyển imperative calls sang <code>usePlayer()</code>{" "}
          hook
        </li>
        <li>
          <input type="checkbox" readOnly /> Import CSS theme:{" "}
          <code>@f8/player-themes/classroom.css</code>
        </li>
      </ul>
    </article>
  );
}

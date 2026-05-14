export default function ApiReferencePage() {
  return (
    <article className="prose">
      <h1>API Reference</h1>

      <h2>@f8team/reel-react</h2>

      <h3>Root</h3>
      <p>Context provider và player lifecycle manager. Bắt buộc wrap quanh mọi thành phần khác.</p>
      <pre>
        <code>{`<Root options={PlayerOptions}>{children}</Root>`}</code>
      </pre>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>options</code>
            </td>
            <td>
              <code>PlayerOptions</code>
            </td>
            <td>Cấu hình player (source, plugins, volume, …)</td>
          </tr>
          <tr>
            <td>
              <code>onReady</code>
            </td>
            <td>
              <code>() =&gt; void</code>
            </td>
            <td>Gọi khi player sẵn sàng phát</td>
          </tr>
          <tr>
            <td>
              <code>onError</code>
            </td>
            <td>
              <code>(err: Error) =&gt; void</code>
            </td>
            <td>Gọi khi có lỗi</td>
          </tr>
        </tbody>
      </table>

      <h3>PlayerOptions</h3>
      <pre>
        <code>{`interface PlayerOptions {
  source: SourceDescriptor;  // { src, tracks? }
  plugins?: Plugin[];        // mảng plugin factory
  autoplay?: boolean;
  muted?: boolean;
  volume?: number;           // 0–1
  playsInline?: boolean;
  crossOrigin?: "anonymous" | "use-credentials";
}`}</code>
      </pre>

      <h3>Video</h3>
      <p>
        Render <code>&lt;video&gt;</code> (hoặc YT iframe) và gắn vào player core. Truyền qua mọi
        prop HTML video.
      </p>
      <pre>
        <code>{`<Video className="..." style={{ ... }} />`}</code>
      </pre>

      <h3>Captions</h3>
      <p>
        Hiển thị phụ đề của track đang active (cần plugin <code>subtitles</code>).
      </p>
      <pre>
        <code>{`<Captions />`}</code>
      </pre>

      <h3>Controls.*</h3>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Props</th>
            <th>Mô tả</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>Controls.Bar</code>
            </td>
            <td>
              <code>className, style</code>
            </td>
            <td>Container cho controls</td>
          </tr>
          <tr>
            <td>
              <code>Controls.PlayPause</code>
            </td>
            <td>—</td>
            <td>Nút Play/Pause</td>
          </tr>
          <tr>
            <td>
              <code>Controls.SeekBar</code>
            </td>
            <td>
              <code>style</code>
            </td>
            <td>Thanh tua, hiện markers nếu có</td>
          </tr>
          <tr>
            <td>
              <code>Controls.Time</code>
            </td>
            <td>
              <code>variant: "current" | "duration"</code>
            </td>
            <td>Hiển thị thời gian</td>
          </tr>
          <tr>
            <td>
              <code>Controls.Mute</code>
            </td>
            <td>—</td>
            <td>Nút tắt/bật tiếng</td>
          </tr>
          <tr>
            <td>
              <code>Controls.Volume</code>
            </td>
            <td>
              <code>style</code>
            </td>
            <td>Thanh âm lượng</td>
          </tr>
          <tr>
            <td>
              <code>Controls.PlaybackRate</code>
            </td>
            <td>—</td>
            <td>Menu tốc độ phát</td>
          </tr>
          <tr>
            <td>
              <code>Controls.Quality</code>
            </td>
            <td>—</td>
            <td>Menu chất lượng HLS (cần plugin)</td>
          </tr>
          <tr>
            <td>
              <code>Controls.Fullscreen</code>
            </td>
            <td>—</td>
            <td>Nút toàn màn hình</td>
          </tr>
        </tbody>
      </table>

      <h3>Hooks</h3>
      <table>
        <thead>
          <tr>
            <th>Hook</th>
            <th>Returns</th>
            <th>Mô tả</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>usePlayer()</code>
            </td>
            <td>
              <code>PlayerHandle</code>
            </td>
            <td>Imperative API: play, pause, seekTo, setVolume, …</td>
          </tr>
          <tr>
            <td>
              <code>usePlayerState(selector)</code>
            </td>
            <td>
              <code>T</code>
            </td>
            <td>Subscribe reactive state (paused, currentTime, …)</td>
          </tr>
          <tr>
            <td>
              <code>usePlayerEvent(event, handler)</code>
            </td>
            <td>
              <code>void</code>
            </td>
            <td>Subscribe typed event từ player core</td>
          </tr>
          <tr>
            <td>
              <code>useSourceType()</code>
            </td>
            <td>
              <code>SourceType | null</code>
            </td>
            <td>Loại nguồn hiện tại: "hls" | "mp4" | "youtube" | "native"</td>
          </tr>
        </tbody>
      </table>

      <h3>PlayerHandle</h3>
      <pre>
        <code>{`interface PlayerHandle {
  play(): Promise<void>;
  pause(): void;
  seekTo(time: number): void;
  setVolume(v: number): void;
  setMuted(m: boolean): void;
  setPlaybackRate(r: number): void;
  command(cmd: string, payload?: unknown): void;
  on(event: string, handler: (data: unknown) => void): () => void;
}`}</code>
      </pre>

      <h2>@f8team/reel-core</h2>
      <p>Framework-agnostic engine. Dùng trực tiếp nếu không dùng React.</p>
      <pre>
        <code>{`import { createPlayer } from "@f8team/reel-core";

const player = createPlayer({
  container: document.getElementById("player"),
  source: { src: "https://example.com/stream.m3u8" },
  plugins: [createKeyboardPlugin()],
});

player.play();
player.on("timeupdate", ({ currentTime }) => console.log(currentTime));`}</code>
      </pre>

      <h2>definePlugin</h2>
      <p>Tạo plugin tuỳ chỉnh:</p>
      <pre>
        <code>{`import { definePlugin } from "@f8team/reel-core";

const myPlugin = definePlugin({
  name: "my-plugin",
  setup(player) {
    player.on("play", () => console.log("playing!"));
    return () => { /* cleanup */ };
  },
});

// Dùng:
plugins: [myPlugin()]`}</code>
      </pre>
    </article>
  );
}

export default function PluginsPage() {
  return (
    <article className="prose">
      <h1>Plugins</h1>
      <p>
        Mỗi plugin là một factory function nhỏ, tree-shakeable. Install riêng package và truyền vào{" "}
        <code>options.plugins</code>.
      </p>

      {PLUGIN_DOCS.map((plugin) => (
        <section key={plugin.name} id={plugin.id} style={{ marginBottom: "4rem" }}>
          <h2>
            <code>{plugin.name}</code>
          </h2>
          <p>{plugin.desc}</p>
          <pre>
            <code>{plugin.example}</code>
          </pre>
          {plugin.options && (
            <>
              <h3>Options</h3>
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Default</th>
                    <th>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {plugin.options.map((o) => (
                    <tr key={o.key}>
                      <td>
                        <code>{o.key}</code>
                      </td>
                      <td>
                        <code>{o.type}</code>
                      </td>
                      <td>{o.default}</td>
                      <td>{o.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      ))}
    </article>
  );
}

const PLUGIN_DOCS = [
  {
    id: "subtitles",
    name: "@f8team/reel-plugin-subtitles",
    desc: "VTT multi-language captions với auto-activate và language selector.",
    example: `import { createSubtitlesPlugin } from "@f8team/reel-plugin-subtitles";

const plugin = createSubtitlesPlugin({
  tracks: [
    { src: "/subs/vi.vtt", srcLang: "vi", label: "Tiếng Việt", default: true },
    { src: "/subs/en.vtt", srcLang: "en", label: "English" },
  ],
  autoActivate: true,
});`,
    options: [
      { key: "tracks", type: "SubtitleTrack[]", default: "[]", desc: "Danh sách VTT tracks" },
      { key: "autoActivate", type: "boolean", default: "false", desc: "Tự bật track mặc định" },
    ],
  },
  {
    id: "markers",
    name: "@f8team/reel-plugin-markers",
    desc: "Chapter/transcript markers trên seek bar. Click để seek. Cập nhật runtime qua command.",
    example: `import { createMarkersPlugin } from "@f8team/reel-plugin-markers";

const plugin = createMarkersPlugin({
  markers: [
    { time: 0,   label: "Intro" },
    { time: 60,  label: "Phần 1" },
    { time: 180, label: "Phần 2" },
  ],
  markerStyle: { backgroundColor: "#f05123", width: "0.6rem" },
});

// Cập nhật runtime:
player.command("markers:setMarkers", newMarkers);`,
    options: [
      {
        key: "markers",
        type: "Marker[]",
        default: "[]",
        desc: "{ time: number; label: string }[]",
      },
      { key: "markerStyle", type: "CSSProperties", default: "—", desc: "Style cho marker element" },
    ],
  },
  {
    id: "keyboard",
    name: "@f8team/reel-plugin-keyboard",
    desc: "Keyboard shortcuts scoped tới player container.",
    example: `import { createKeyboardPlugin } from "@f8team/reel-plugin-keyboard";

const plugin = createKeyboardPlugin({
  seekStep: 10,      // seconds
  volumeStep: 0.1,
});`,
    options: [
      { key: "seekStep", type: "number", default: "10", desc: "Số giây seek mỗi lần ←/→" },
      { key: "volumeStep", type: "number", default: "0.1", desc: "Bước tăng/giảm âm lượng ↑/↓" },
      {
        key: "enableVolumeScroll",
        type: "boolean",
        default: "false",
        desc: "Scroll chuột để chỉnh âm lượng",
      },
    ],
  },
  {
    id: "hls-quality",
    name: "@f8team/reel-plugin-hls-quality",
    desc: "Manual/auto ABR quality selection cho HLS streams.",
    example: `import { createHlsQualityPlugin } from "@f8team/reel-plugin-hls-quality";

const plugin = createHlsQualityPlugin({
  defaultQuality: "auto",
});`,
    options: [
      {
        key: "defaultQuality",
        type: '"auto" | number',
        default: '"auto"',
        desc: "Quality ban đầu",
      },
    ],
  },
  {
    id: "analytics",
    name: "@f8team/reel-plugin-analytics",
    desc: "Phát events analytics qua sink callback. Hỗ trợ: play, pause, progress, ended, seek, error.",
    example: `import { createAnalyticsPlugin } from "@f8team/reel-plugin-analytics";

const plugin = createAnalyticsPlugin({
  progressInterval: 30_000, // ms
  sink(event) {
    analytics.track(event.type, event);
  },
});`,
    options: [
      {
        key: "sink",
        type: "(event: AnalyticsEvent) => void",
        default: "—",
        desc: "Callback nhận events",
      },
      {
        key: "progressInterval",
        type: "number",
        default: "30000",
        desc: "Khoảng cách giữa các progress events (ms)",
      },
    ],
  },
  {
    id: "watermark",
    name: "@f8team/reel-plugin-watermark",
    desc: "Premium text/image overlay với 5 vị trí.",
    example: `import { createWatermarkPlugin } from "@f8team/reel-plugin-watermark";

const plugin = createWatermarkPlugin({
  text: "F8 Premium",
  position: "top-right",  // top-left | bottom-right | bottom-left | center
  opacity: 0.5,
  fontSize: "1.4rem",
});`,
    options: [
      { key: "text", type: "string", default: "—", desc: "Nội dung watermark" },
      { key: "imageUrl", type: "string", default: "—", desc: "URL logo (thay cho text)" },
      {
        key: "position",
        type: "string",
        default: '"top-right"',
        desc: "top-right | top-left | bottom-right | bottom-left | center",
      },
      { key: "opacity", type: "number", default: "0.5", desc: "Độ mờ 0–1" },
    ],
  },
  {
    id: "resume-position",
    name: "@f8team/reel-plugin-resume-position",
    desc: "Lưu vị trí phát vào localStorage và tự resume lần sau.",
    example: `import { createResumePositionPlugin } from "@f8team/reel-plugin-resume-position";

const plugin = createResumePositionPlugin({
  storageKey: "my-app-resume",
  minResumeTime: 5,       // không resume nếu < 5 giây
  maxResumePercent: 0.95, // không resume nếu gần hết
});`,
    options: [
      {
        key: "storageKey",
        type: "string",
        default: '"f8p-resume"',
        desc: "Key trong localStorage",
      },
      {
        key: "minResumeTime",
        type: "number",
        default: "5",
        desc: "Ngưỡng thời gian tối thiểu để lưu",
      },
    ],
  },
  {
    id: "auth-aware",
    name: "@f8team/reel-plugin-auth-aware",
    desc: "Intercept 401/403 từ allowlisted domains, tự pause và gọi callback.",
    example: `import { createAuthAwarePlugin } from "@f8team/reel-plugin-auth-aware";

const plugin = createAuthAwarePlugin({
  allowlist: ["https://api.example.com"],
  pauseOnUnauthorized: true,
  onUnauthorized: () => showLoginModal(),
});`,
    options: [
      { key: "allowlist", type: "string[]", default: "[]", desc: "Domains kích hoạt auth check" },
      {
        key: "pauseOnUnauthorized",
        type: "boolean",
        default: "true",
        desc: "Pause khi nhận 401/403",
      },
      {
        key: "onUnauthorized",
        type: "() => void",
        default: "—",
        desc: "Callback khi unauthorized",
      },
    ],
  },
  {
    id: "pip",
    name: "@f8team/reel-plugin-pip",
    desc: "Picture-in-Picture qua native browser API.",
    example: `import { createPipPlugin } from "@f8team/reel-plugin-pip";
const plugin = createPipPlugin();`,
    options: [],
  },
  {
    id: "fullscreen",
    name: "@f8team/reel-plugin-fullscreen",
    desc: "Native Fullscreen API. Wires Controls.Fullscreen và phím F (cần keyboard plugin).",
    example: `import { createFullscreenPlugin } from "@f8team/reel-plugin-fullscreen";
const plugin = createFullscreenPlugin();`,
    options: [],
  },
  {
    id: "touch-gestures",
    name: "@f8team/reel-plugin-touch-gestures",
    desc: "Mobile touch: single tap (toggle controls), double-tap (seek ±10s), long press (pause).",
    example: `import { createTouchGesturesPlugin } from "@f8team/reel-plugin-touch-gestures";
const plugin = createTouchGesturesPlugin({ seekStep: 10 });`,
    options: [{ key: "seekStep", type: "number", default: "10", desc: "Giây seek khi double-tap" }],
  },
  {
    id: "story-gestures",
    name: "@f8team/reel-plugin-story-gestures",
    desc: "Story-reel: swipe left/right (next/prev), tap thirds (seek), hold (pause).",
    example: `import { createStoryGesturesPlugin } from "@f8team/reel-plugin-story-gestures";

const plugin = createStoryGesturesPlugin({
  onNext: () => goToNextStory(),
  onPrev: () => goToPrevStory(),
});`,
    options: [
      {
        key: "onNext",
        type: "() => void",
        default: "—",
        desc: "Gọi khi swipe sang story tiếp theo",
      },
      { key: "onPrev", type: "() => void", default: "—", desc: "Gọi khi swipe về story trước" },
    ],
  },
  {
    id: "safari-fallback",
    name: "@f8team/reel-plugin-safari-mp4-fallback",
    desc: "Dùng MP4 URL trực tiếp trên desktop Safari hoặc khi source type là mp4, bỏ qua hls.js.",
    example: `import { createSafariMp4FallbackPlugin } from "@f8team/reel-plugin-safari-mp4-fallback";

const plugin = createSafariMp4FallbackPlugin({
  mp4Url: "https://cdn.example.com/video.mp4",
});`,
    options: [{ key: "mp4Url", type: "string", default: "—", desc: "URL MP4 fallback" }],
  },
];

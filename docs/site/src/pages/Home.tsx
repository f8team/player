import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">▶ v0.1.0 — Production ready</div>
        <h1>
          Video player engine
          <br />
          for modern web apps
        </h1>
        <p>
          Headless, framework-agnostic, plugin-driven. Built on native <code>HTMLMediaElement</code>{" "}
          and designed to last. Zero runtime styling — bring your own theme.
        </p>
        <div className="hero-actions">
          <Link to="/getting-started" className="btn-primary">
            Get started →
          </Link>
          <Link to="/playground" className="btn-secondary">
            Live playground
          </Link>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────────── */}
      <section>
        <div className="prose">
          <h2>Tại sao chọn Reel?</h2>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <h3>
                {f.icon} {f.title}
              </h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Quick start ──────────────────────────────────────────────────── */}
      <section className="prose">
        <h2>Quick start</h2>
        <pre className="code-block">{`# pnpm
pnpm add @f8team/reel-react @f8team/reel-core
pnpm add @f8team/reel-themes        # optional CSS themes

# npm
npm install @f8team/reel-react @f8team/reel-core`}</pre>

        <pre className="code-block">{`import { Root, Video, Controls } from "@f8team/reel-react";
import "@f8team/reel-themes/classroom.css"; // optional

export default function MyPlayer() {
  return (
    <div data-reel="" data-theme="classroom"
         style={{ position: "relative", aspectRatio: "16/9" }}>
      <Root options={{ source: { src: "https://example.com/video.m3u8" } }}>
        <Video style={{ position: "absolute", inset: 0 }} />
        <Controls.Bar>
          <Controls.PlayPause />
          <Controls.SeekBar />
          <Controls.Time variant="current" />
          <Controls.Mute />
          <Controls.Fullscreen />
        </Controls.Bar>
      </Root>
    </div>
  );
}`}</pre>
        <p>
          <Link to="/getting-started">Xem hướng dẫn chi tiết →</Link>
        </p>
      </section>

      {/* ─── Plugin ecosystem ──────────────────────────────────────────────── */}
      <section className="prose">
        <h2>Plugin ecosystem</h2>
        <p>
          Mỗi plugin là một <em>factory function</em> nhỏ, tree-shakeable, bundle riêng. Chỉ ship
          những gì bạn dùng.
        </p>
        <table>
          <thead>
            <tr>
              <th>Plugin</th>
              <th>Bundle (gzip)</th>
              <th>Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {PLUGINS.map((p) => (
              <tr key={p.name}>
                <td>
                  <code>{p.name}</code>
                </td>
                <td>{p.size}</td>
                <td>{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <Link to="/plugins">API Reference cho từng plugin →</Link>
        </p>
      </section>
    </>
  );
}

const FEATURES = [
  {
    icon: "🎯",
    title: "Headless",
    desc: "Zero default styling. Compose Root, Video, Captions, Controls.* với bất kỳ design system nào.",
  },
  {
    icon: "🔌",
    title: "Plugin-driven",
    desc: "13 plugins sẵn sàng: subtitles, markers, keyboard, HLS quality, PiP, analytics, watermark, resume position, auth-aware...",
  },
  {
    icon: "📦",
    title: "Tree-shakeable",
    desc: "Mỗi plugin là gói riêng. Bundle cuối chỉ chứa những gì bạn import.",
  },
  {
    icon: "🎨",
    title: "4 themes",
    desc: "Classroom, Story, Admin, Minimal — CSS variables, override bất kỳ token nào.",
  },
  {
    icon: "⚡",
    title: "HLS native",
    desc: "hls.js tích hợp sẵn. ABR tự động. Quality selector với createHlsQualityPlugin.",
  },
  {
    icon: "📱",
    title: "Mobile-first",
    desc: "Touch gestures, story gestures, PiP, hardware media session — hoạt động tốt trên iOS/Android.",
  },
  {
    icon: "♿",
    title: "Accessible",
    desc: "ARIA attributes, keyboard navigation, focus management theo WCAG 2.1 AA.",
  },
  {
    icon: "🔒",
    title: "Auth-aware",
    desc: "Intercept 401/403 từ allowlisted domains, tự pause và gọi onUnauthorized callback.",
  },
];

const PLUGINS = [
  { name: "subtitles", size: "518 B", desc: "VTT captions, multi-language, auto-activate" },
  { name: "markers", size: "346 B", desc: "Chapter/transcript markers on seek bar" },
  { name: "keyboard", size: "642 B", desc: "Space, arrows, F, M keyboard shortcuts" },
  { name: "hls-quality", size: "280 B", desc: "ABR quality picker for HLS" },
  { name: "touch-gestures", size: "759 B", desc: "Tap/double-tap/hold on mobile" },
  { name: "story-gestures", size: "701 B", desc: "Story-reel swipe navigation" },
  { name: "resume-position", size: "542 B", desc: "localStorage resume position" },
  { name: "auth-aware", size: "407 B", desc: "withCredentials + 401/403 callback" },
  { name: "analytics", size: "436 B", desc: "Pluggable analytics sink" },
  { name: "pip", size: "294 B", desc: "Picture-in-Picture" },
  { name: "fullscreen", size: "N/A", desc: "Native Fullscreen API" },
  { name: "watermark", size: "284 B", desc: "Premium text/image overlay" },
  { name: "safari-mp4-fallback", size: "412 B", desc: "MP4 fallback on desktop Safari" },
];

import { NavLink } from "react-router-dom";

const NAV = [
  {
    section: "Bắt đầu",
    links: [
      { to: "/", label: "Giới thiệu" },
      { to: "/getting-started", label: "Hướng dẫn cài đặt" },
      { to: "/playground", label: "Playground" },
      { to: "/launch", label: "Public launch" },
    ],
  },
  {
    section: "Tài liệu",
    links: [
      { to: "/api", label: "API Reference" },
      { to: "/plugins", label: "Plugins" },
      { to: "/plugin-authoring", label: "Plugin authoring" },
    ],
  },
  {
    section: "Migration",
    links: [
      { to: "/migration/react-player", label: "Từ react-player" },
      { to: "/migration/videojs", label: "Từ video.js" },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="site-sidebar">
      <a href="/" className="sidebar-logo">
        ▶ @f8/player
      </a>
      {NAV.map((group) => (
        <div key={group.section}>
          <div className="sidebar-section">{group.section}</div>
          {group.links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              {label}
            </NavLink>
          ))}
        </div>
      ))}
      <div style={{ marginTop: "auto", paddingTop: "2.4rem", borderTop: "1px solid #e5e7eb" }}>
        <a
          href="https://github.com/f8/player"
          className="sidebar-link"
          target="_blank"
          rel="noreferrer"
        >
          GitHub →
        </a>
        <a href="/storybook" className="sidebar-link" target="_blank" rel="noreferrer">
          Storybook →
        </a>
      </div>
    </aside>
  );
}

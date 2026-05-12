import { Link } from "react-router-dom";

const LAUNCH_CHECKS = [
  "Core packages public, MIT, publish qua Changesets + npm provenance.",
  "Premium plugins/themes chỉ mở khi license provider và legal docs đã được duyệt.",
  "Error telemetry phải opt-in, ẩn danh, và có mô tả rõ trong privacy policy.",
  "Community support đi qua GitHub Discussions và Discord, không hứa SLA cho bản OSS.",
];

const PLANS = [
  {
    name: "Open Source",
    price: "Free",
    badge: "MIT",
    description: "Core engine, React adapter, themes cơ bản và plugin phổ biến cho sản phẩm F8.",
    items: [
      "@f8/player-core",
      "@f8/player-react",
      "Classroom / Story / Admin / Minimal themes",
      "Community support",
    ],
  },
  {
    name: "Premium",
    price: "TBD",
    badge: "Requires license engine",
    description:
      "Plugin/theme nâng cao cho đội cần white-label, watermark, analytics và support thương mại.",
    items: [
      "License validation",
      "Premium plugin bundles",
      "Commercial legal terms",
      "Priority support scope",
    ],
  },
];

export default function PublicLaunchPage() {
  return (
    <article>
      <section className="hero">
        <div className="hero-badge">Phase 8 — Public launch</div>
        <h1>
          Launch-ready video player
          <br />
          for F8 products and the web
        </h1>
        <p>
          Public launch focuses on a clean docs portal, transparent package tiers, verified CI
          gates, and clear blockers before billing or telemetry ship to users.
        </p>
        <div className="hero-actions">
          <Link to="/getting-started" className="btn-primary">
            Start with OSS core →
          </Link>
          <a
            href="https://github.com/f8/player/discussions"
            className="btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
            GitHub Discussions
          </a>
        </div>
      </section>

      <section className="prose">
        <h2>Launch tiers</h2>
        <p>
          Pricing is intentionally explicit about what is ready now and what still needs
          owner-approved billing/legal decisions.
        </p>
      </section>

      <div className="feature-grid">
        {PLANS.map((plan) => (
          <section key={plan.name} className="feature-card launch-card">
            <div className="launch-card-header">
              <div>
                <h3>{plan.name}</h3>
                <strong>{plan.price}</strong>
              </div>
              <span>{plan.badge}</span>
            </div>
            <p>{plan.description}</p>
            <ul>
              {plan.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="prose">
        <h2>Launch checklist</h2>
        <ul>
          {LAUNCH_CHECKS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>What is intentionally blocked?</h2>
        <p>
          Purchase buttons, license validation, legal documents, and telemetry collection are not
          enabled until their owner-approved contracts are present in the repo.
        </p>
      </section>
    </article>
  );
}

# Public launch checklist

## Repo-ready

- Docs portal exposes install, API, plugins, playground, migration, and public launch entry points.
- CI gates cover format, lint, typecheck, tests, build, size, production audit, Storybook axe, and Lighthouse.
- npm release uses Changesets with provenance.
- `.lighthouseci/` and generated build artifacts stay out of git.

## Owner approval required

- Legal: terms of service, privacy policy, DPA, and premium EULA.
- Billing: provider choice, webhook owner, refund/cancellation policy, tax handling.
- Community: Discord invite, moderation owner, GitHub Discussions categories.
- Telemetry: opt-in copy, data retention, event schema, and privacy policy coverage.

## Telemetry guardrails

- Default is off.
- No email, user id, license key, token, or source URL is sent by default.
- Events must be sampled and anonymous.
- UI must explain what is collected before enabling telemetry.

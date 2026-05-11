# Changesets

Hi! This folder is used by [Changesets](https://github.com/changesets/changesets).

When you add a user-facing change, run `pnpm changeset` and follow the prompts.
The CLI writes a markdown file to this folder; commit it with your PR. On merge
to `main`, the release workflow opens (or pushes to) a "Version packages" PR
which, when merged, publishes to npm with provenance.

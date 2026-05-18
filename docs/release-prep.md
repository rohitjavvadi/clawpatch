---
title: Release Prep
description: "No-publish checks for preparing a clawpatch release"
---

# Release Prep

This checklist audits release readiness only. It does not publish, tag, create a
GitHub release, or change the package version.

## Current Snapshot

As of 2026-05-18:

- GitHub latest full release: `v0.3.0`
- `package.json` version: `0.3.0`
- npm `clawpatch` version: `0.3.0`
- `pnpm pack:smoke` passed
- `npm pack --dry-run --json --ignore-scripts` included expected package
  contents such as `dist/`, `README.md`, `LICENSE`, and `package.json`

Prepare the next release only after the maintainer confirms the target version
and timing.

## Audit Commands

```bash
gh release list --repo openclaw/clawpatch --limit 20 --json tagName,isPrerelease,isDraft,publishedAt,isLatest
node -p "require('./package.json').version"
npm view clawpatch version --json
```

## Validation Commands

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm exec vitest run --maxWorkers=1
pnpm build
pnpm pack:smoke
npm pack --dry-run --json --ignore-scripts
```

## Manual Checks

- Confirm `CHANGELOG.md` has all user-visible, operational, or security-relevant
  changes under the next unreleased version.
- Confirm README and docs mention any new mapper behavior, commands, or safety
  constraints.
- Confirm the dry-run package includes built `dist/` files and excludes local
  state, fixtures that should not ship, and private paths.
- Confirm no release action has been run unless release timing is explicitly
  approved.

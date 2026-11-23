<div align="center">
  <img src="https://github.com/leverframe/skillguard/raw/main/assets/header.png" width="1280" alt="skillguard — signed plugin directory for Claude Code">
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-BUSL--1.1-FFB000?style=flat-square&labelColor=111213" alt="License: BUSL-1.1"></a>
  </p>
</div>

---

A signed + transparent plugin directory for Claude Code. skillguard installs plugins from GitHub releases only after verifying a minisign signature against the repo's published `KEYS.txt`, shows you exactly what the plugin contains, and installs it atomically with versioned directories and an `active` symlink. A companion indexer crawls plugin repos nightly and produces a trust-annotated index (account age, signing-key age, signed-commit ratio).

**Status:** pre-alpha (v0.0.1).

## How it works

1. `skillguard install <github-repo-url>` fetches the repo's latest GitHub release.
2. The release must ship a `.minisig` signature asset and a `KEYS.txt` asset — **unsigned plugins are refused outright**.
3. The tarball signature is verified with `minisign`, the TOML manifest and `plugin.json` are parsed, and a preview is rendered.
4. You confirm each category of content before anything is written (or pass `--yes` to skip).
5. The plugin is installed atomically into `~/.claude/plugins/` (versioned directory) and symlinked into `~/.claude/plugins/active/`.

## Setup

Requires Node.js >= 20 and the `minisign` binary on your PATH.

```bash
npm install
npm run build
```

Environment variables:

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | PAT with public-repo read. Optional for the CLI; the indexer needs it (anonymous rate limit is 10 req/hr). |
| `SKILLGUARD_PLUGINS_ROOT` | Override install root (default `~/.claude/plugins`). |
| `SKILLGUARD_ACTIVE_DIR` | Override the active-symlink dir (default `~/.claude/plugins/active`). |
| `SKILLGUARD_INDEX_OUTPUT` | Override indexer output path (default `dist/index.json`). |

## Usage

```bash
# Run from source
npm run dev -- install https://github.com/owner/repo

# Or after build, via the bin
skillguard install https://github.com/owner/repo
skillguard install https://github.com/owner/repo --dry-run   # preview only
skillguard install https://github.com/owner/repo --yes       # skip confirmations
```

The indexer is a second binary, `skillguard-indexer` (`src/indexer/index.ts`): it crawls known plugin repos, records trust signals (account age, key age, signed-commits), and emits `dist/index.json` plus a `index.log.jsonl` sidecar of per-repo failures.

## Development

```bash
npm run build        # tsc -> dist/
npm test             # vitest run
npm run test:watch   # vitest in watch mode
npm run dev          # tsx src/cli/index.ts
```

## Project structure

```
skillguard/
├── src/
│   ├── cli/          # commander CLI (install command)
│   ├── fetch/        # GitHub release lookup + tarball download
│   ├── indexer/      # crawl pipeline, trust badges, index emitter
│   ├── install/      # atomic install + active symlink
│   ├── manifest/     # TOML manifest parsing
│   ├── preview/      # plugin.json parsing + preview rendering
│   ├── prompt/       # per-category install confirmation
│   └── verify/       # minisign signature verification
├── tests/            # e2e tests, fixtures, indexer tests
└── ops/              # systemd service + timer for the indexer (see ops/README.md)
```

## Ops

The indexer is deployed to a Linux host as a systemd timer (daily at 04:00 with jitter). Exit code 75 signals GitHub rate-limiting so systemd retries on the next tick. Deployment details are in [`ops/README.md`](ops/README.md).

## License

BUSL-1.1 — see [LICENSE](LICENSE). Source-available; converts to MIT on 2030-10-12.

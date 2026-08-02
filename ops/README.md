# skillguard-indexer ops

## Where it runs
- Host: your fleet Linux box (systemd-capable; the indexer is host-agnostic)
- User: `openclaw`
- Install dir: `/opt/skillguard`
- Log: `/var/log/skillguard/indexer.log`
- Output: `/opt/skillguard/dist/index.json` (default; override via `SKILLGUARD_INDEX_OUTPUT` in `.env`)

## Schedule
- systemd timer: `OnCalendar=*-*-* 04:00:00` with up to 30min jitter
- `Persistent=true` catches up on missed runs after host downtime

## Required env (.env at /opt/skillguard/.env, chmod 600, owner openclaw)
- `GITHUB_TOKEN` — PAT with public-repo read. Without it, anonymous rate limit is 10 req/hr (will fail mid-crawl).

## Common ops
- Tail logs: `journalctl -u skillguard-indexer -f`
- Manual run: `systemctl start skillguard-indexer.service`
- Disable temporarily: `systemctl stop skillguard-indexer.timer`
- Inspect failures: `cat /opt/skillguard/dist/index.log.jsonl | jq .`

## Exit codes
- 0: full run completed (may include per-repo failures in sidecar log)
- 1: fatal error (see stack in log)
- 75: rate-limited — systemd treats as transient; next timer tick will retry

## Updating the indexer
1. Pull latest on dev machine
2. `npm run build`
3. `rsync -avz --delete dist/ <your-host>:/opt/skillguard/dist/`
4. `ssh <your-host> 'sudo systemctl restart skillguard-indexer.service'`

## Failure modes
- **Rate limit (exit 75):** Wait for reset. Search API is hard-capped at 30 req/min.
- **minisign binary missing on host:** `apt install minisign` (Debian) or build from source. Check: `command -v minisign`.
- **Cloudflare cache serving stale index:** Page rule TTL is 1h. Force purge via dashboard after emergency re-index.

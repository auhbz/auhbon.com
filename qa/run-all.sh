#!/bin/bash
# Browser QA for auhbon.com: static checks, production build, then the three suites in parallel.
# Usage (from the repo root): qa/run-all.sh [shots-dir]
# First time: (cd qa && npm install) — Playwright drives a local Chrome (set CHROME if not at /opt/google/chrome/chrome).
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=${1:-$ROOT/qa/.shots}; LOGS=$ROOT/qa/.logs; mkdir -p "$OUT" "$LOGS"
ps aux | grep -E "next-server|next start" | grep -v grep | awk '{print $2}' | xargs -r kill
# Mock GitHub API so the "On GitHub" section is deterministic.
curl -s -o /dev/null localhost:8787 || (cd "$ROOT/qa/fixture" && nohup python3 -m http.server 8787 > "$LOGS/fixture.log" 2>&1 &)
cd "$ROOT"
npx next typegen >/dev/null 2>&1
npm run lint --silent && npx tsc --noEmit && node scripts/emoji-check.mjs >/dev/null || { echo "STATIC CHECKS FAILED"; exit 1; }
GITHUB_API_URL=http://localhost:8787 npm run build > "$LOGS/build.log" 2>&1 || { echo "BUILD FAILED"; tail -20 "$LOGS/build.log"; exit 1; }
(GITHUB_API_URL=http://localhost:8787 nohup npm start > "$LOGS/server.log" 2>&1 &)
sleep 4
cd "$ROOT/qa"
node fun2.mjs "$OUT" > "$LOGS/fun2.log" 2>&1 &
node core.mjs "$OUT" > "$LOGS/core.log" 2>&1 &
node interactive.mjs "$OUT" > "$LOGS/interactive.log" 2>&1 &
node audit.mjs "$OUT" > "$LOGS/audit.log" 2>&1 &
wait
for f in fun2 core interactive audit; do echo "== $f"; grep -v "^pass" "$LOGS/$f.log" | tail -6; done

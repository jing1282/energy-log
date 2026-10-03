#!/usr/bin/env bash
set -euo pipefail
cd /workspace

if tmux has-session -t energy-app 2>/dev/null && curl -fs -o /dev/null http://127.0.0.1:47231/; then
  exit 0
fi

tmux kill-session -t energy-app 2>/dev/null || true
[ -f out/index.html ] || npm run build
tmux new-session -d -s energy-app -c /workspace "while true; do npm run start; sleep 2; done"

for _ in $(seq 1 30); do
  curl -fs -o /dev/null http://127.0.0.1:47231/ && exit 0
  sleep 1
done
echo "服务未能在 30 秒内启动" >&2
exit 1

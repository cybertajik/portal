#!/usr/bin/env bash
cd /opt/apps/portal || exit 1
git fetch origin main >/dev/null 2>&1
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL" != "" ] && [ "$REMOTE" != "" ] && [ "$LOCAL" != "$REMOTE" ]; then
    echo "[AutoSync] $(date): Update detected ($LOCAL -> $REMOTE). Pulling..." >> /opt/apps/portal/auto_sync.log
    git pull origin main >> /opt/apps/portal/auto_sync.log 2>&1
    docker compose up -d --build >> /opt/apps/portal/auto_sync.log 2>&1
    echo "[AutoSync] $(date): Rebuilt successfully." >> /opt/apps/portal/auto_sync.log
fi

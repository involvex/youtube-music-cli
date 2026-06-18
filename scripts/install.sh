#!/usr/bin/env bash
set -euo pipefail

PACKAGE="@involvex/youtube-music-cli"

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun is required to run ${PACKAGE}." >&2
  echo "Install bun: https://bun.sh" >&2
  exit 1
fi

bun install -g "$PACKAGE"

echo "youtube-music-cli installed. Run: youtube-music-cli"

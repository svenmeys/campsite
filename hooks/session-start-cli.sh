#!/bin/bash
# 🏕️ Campsite session-start hook (CLI version)
# Uses campsite commands directly. Requires campsite on PATH.

input=$(cat)

if ! command -v campsite >/dev/null 2>&1; then
  echo "campsite not found. Install with: bun install -g @svenmeys/campsite"
  exit 0
fi

campsite context 2>/dev/null
echo ""
campsite status --brief 2>/dev/null

exit 0

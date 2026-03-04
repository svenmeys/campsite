#!/bin/bash
# 🏕️ Campsite session-start hook
# Surfaces working context, active quests, and backlog at session start.

input=$(cat)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Get repo name
REPO_NAME=$(basename "$PROJECT_DIR")
if git -C "$PROJECT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
  REPO_NAME=$(basename "$(git -C "$PROJECT_DIR" rev-parse --show-toplevel)")
fi

# Read stash root from config, default to ~/.campsite
CONFIG_FILE="$HOME/.campsite/config.json"
if [[ -f "$CONFIG_FILE" ]] && command -v jq >/dev/null 2>&1; then
  STASH_ROOT=$(jq -r '.stashRoot // empty' "$CONFIG_FILE" 2>/dev/null)
  STASH_ROOT=$(echo "$STASH_ROOT" | sed "s|^~|$HOME|")
fi
STASH_ROOT="${STASH_ROOT:-$HOME/.campsite}"
STASH_DIR="$STASH_ROOT/$REPO_NAME"

# --- Trail Map (Working Context) ---

context_dir="$STASH_DIR/working-context"
latest_context=""
if [[ -d "$context_dir" ]]; then
  latest_context=$(ls -t "$context_dir"/*.md 2>/dev/null | head -1)
fi

if [[ -n "$latest_context" ]]; then
  echo "🗺️ Context (last session):"
  cat "$latest_context"
  echo ""
elif [[ -d "$STASH_DIR" ]]; then
  echo "🗺️ No context found. Write one at session end with /journal."
fi

# --- Active Plan ---

quest_dir="$STASH_DIR/plans"
if [[ -d "$quest_dir" ]]; then
  latest_quest=$(ls -t "$quest_dir"/*.md 2>/dev/null | head -1)
  if [[ -n "$latest_quest" ]]; then
    quest_name=$(basename "$latest_quest" .md)
    if grep -q "In Progress\|🔄" "$latest_quest" 2>/dev/null; then
      echo "📋 Active plan: $quest_name"
      echo "---"
      sed -n '/^## Piece/,/^## [^P]\|^---$/p' "$latest_quest" 2>/dev/null | head -30
      echo ""
    fi
  fi
fi

# --- Side Quests ---

backlog="$STASH_DIR/backlog.md"
if [[ -f "$backlog" ]]; then
  count=$(grep -c '^[0-9]' "$backlog" 2>/dev/null || echo "0")
  if [[ "$count" -gt 0 ]]; then
    echo "📌 $count side quests open. Review with: campsite backlog"
  fi
fi

# --- Branch Health ---

if git -C "$PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null)
  if [[ -n "$branch" ]]; then
    echo ""
    echo "🔀 Branch: $branch"
    for main_branch in beta main master; do
      if git -C "$PROJECT_DIR" rev-parse --verify "$main_branch" >/dev/null 2>&1; then
        commit_count=$(git -C "$PROJECT_DIR" rev-list --count "$main_branch..$branch" 2>/dev/null || echo "0")
        if [[ "$commit_count" -gt 10 ]]; then
          echo "⚠️  $commit_count commits ahead of $main_branch. Consider shipping what's ready."
        fi
        break
      fi
    done
  fi
fi

exit 0

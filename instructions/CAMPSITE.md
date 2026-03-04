# Campsite — Session Workflow

This project uses campsite for persistent session memory.

## At Session Start

Run `campsite context` to see the working context from the last session. This tells you:
- What was worked on
- Where things left off
- What the next step is

## During Work

When you notice something off-topic (a bug, tech debt, a feature idea, "we should also..."):

```bash
campsite sq "description of what you noticed"
```

Don't act on it. Don't discuss it. Just capture it and stay on scope.

## At Session End

### 1. Write a journal

Compose a narrative of what happened — the journey, not just the destination. Pipe it to campsite:

```bash
cat <<'EOF' | campsite journal
# Session Journal

## Goal
[What you set out to do]

## What Happened
[The journey — roadblocks, pivots, dead ends, aha moments, key decisions]

## Outcome
[What was accomplished, what's left]

## TLDR

|     | Topic        | Summary        |
| --- | ------------ | -------------- |
| 🎯  | Feature work | Added auth API |

## Quest Log

| Quest        | Status         | Next      |
| ------------ | -------------- | --------- |
| Auth Feature | 🔄 In Progress | Add tests |
EOF
```

**Include:** decisions + reasoning, dead ends (saves future retries), the messy parts.
**Skip:** file-by-file change lists (git tracks that), routine play-by-play.

### 2. Write working context

Compose a handoff for the next session:

```bash
campsite context "$(cat <<'EOF'
# Working Context

Updated: YYYY-MM-DD

## Handoff
[1-2 sentence summary + immediate next step]

## Continuation Prompt
> "[Ready-to-paste prompt for a fresh session to pick up where this one left off]"

## Active Quests
| Quest | Status | Next |
|-------|--------|------|
| [name] | 🔄 In Progress | [next action] |

## Key Files
- `path/to/file` — why it matters

## Scratchpad
[Notes, decisions pending]
🔀 Branch: branch-name
EOF
)"
```

## Status Indicators

- ✅ Done — Completed
- 🔄 In Progress — Started but not finished
- 📋 Parked — Intentionally paused

## Commands Reference

```
campsite init           Set up stash for current repo
campsite sq "msg"       Capture a side quest
campsite sq done <n>    Remove side quest by number
campsite journal        Write journal (pipe content or --file)
campsite context        Read latest working context
campsite context "text" Write working context (inline)
campsite context -      Write working context (piped stdin)
campsite status         Stash overview
campsite backlog        List side quests
```

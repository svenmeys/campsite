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

## Behavioral Rules

- **Side quests are sacred.** Anything off-topic during focused work gets `campsite sq`'d. Never mix unrelated changes into the current task.
- **Journal the journey, not the destination.** Dead ends and pivots are more valuable than "changed X in Y" — git already tracks file changes.
- **Working context is a handoff.** Write it as if a different agent will read it cold. Include the continuation prompt.
- **One scope per session.** If scope grows, capture overflow with `campsite sq`, don't expand the current task.

## Status Indicators

- ✅ Done — Completed
- 🔄 In Progress — Started but not finished (include next step)
- 📋 Parked — Intentionally paused (note why)

## Commands Reference

```
campsite init           Set up stash for current repo
campsite context        Read latest working context
campsite context "text" Write working context (inline)
campsite context -      Write working context (piped stdin)
campsite journal        Write journal (pipe content or --file)
campsite sq "multi-word message"   Capture (one quoted argument)
campsite sq --group "UI" "Fix toolbar spacing" # Capture in a group
campsite sq list                           # Groups, then ungrouped
campsite sq list "UI"                      # One group
campsite sq group 12 "UI"                  # Move quest
campsite sq group 12 --none                # Clear group

campsite sq done <n>    Remove side quest by number
campsite backlog        List side quests by group
campsite status         Stash overview
```

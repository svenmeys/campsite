# Campsite for Windsurf

Add the following rule file to your project. Windsurf rules go in `.windsurf/rules/` with a 6000-character limit per file.

## Rule File

Save as `.windsurf/rules/campsite.md`:

````markdown
# Session Workflow

This project uses `campsite` for persistent session memory across AI sessions.

## At Session Start

Run `campsite context` before doing any work. This outputs the working context from the last session — what was done, where things left off, and the next step.

If it returns nothing, this is the first session. Proceed normally.

## During Work

When you notice something unrelated to the current task — a bug, tech debt, a feature idea:

```bash
campsite sq "brief description"
```

Do not act on it. Do not discuss it. Capture and continue.

## At Session End

### 1. Write a journal

Compose a narrative of what happened — goals, decisions, dead ends, pivots, outcomes. Not a file changelog (git tracks that). Pipe it:

```bash
cat <<'EOF' | campsite journal
# Session Journal

## Goal
[What you set out to do]

## What Happened
[The journey — roadblocks, pivots, dead ends, key decisions]

## Outcome
[What was accomplished, what's left]
EOF
```

Include: decisions + reasoning, dead ends, the messy parts.
Skip: file-by-file change lists, routine play-by-play.

### 2. Write working context

A handoff for the next session:

```bash
campsite context "$(cat <<'EOF'
# Working Context

Updated: YYYY-MM-DD

## Handoff
[1-2 sentence summary + immediate next step]

## Continuation Prompt
> "[Prompt for a fresh session to pick up where this left off]"

## Active Quests
| Quest | Status | Next |
|-------|--------|------|
| [name] | 🔄 In Progress | [next action] |

## Key Files
- `path/to/file` — why it matters
EOF
)"
```

## Behavioral Rules

- Anything off-topic during focused work gets `campsite sq`'d — never mix unrelated changes
- Journal the journey, not the destination — dead ends > file changelogs
- Working context is a handoff — write it as if a different agent reads it cold
- One scope per session — capture overflow with `campsite sq`

## Commands

```
campsite context        Read latest working context
campsite context "text" Write working context
campsite journal        Write journal (pipe content)
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
````

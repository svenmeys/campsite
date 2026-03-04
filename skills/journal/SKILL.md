---
name: journal
description: "Write a session journal at session end. Captures what happened — decisions made, dead ends explored, solutions found. Use when the user says 'journal', 'wrap up', 'log this session', or invokes /journal."
---

# Session Journal

Capture the session story. One entry per session — write-only, no reads needed.

## When to Use

- At session end to capture what was done
- When user says "journal", "wrap up", "log this session"
- Manual invocation only (`/journal`)

## How It Works

You compose the narrative from the conversation in memory. The `campsite` CLI handles file management (paths, session numbering, directory creation).

## Steps

### 1. Get Session Info

```bash
campsite status --brief
```

This gives you repo name, today's session count, and open side quests.

### 2. Compose the Journal

Start the journal with a header using the entry type that best fits the session:

| Emoji | Type        | When to use                              |
| ----- | ----------- | ---------------------------------------- |
| 🎯    | quest       | Main work intent, what you set out to do |
| ✨    | shiny       | Got attracted to something new           |
| 🐿️    | squirrel    | Sudden unrelated context switch          |
| 🕳️    | rabbit-hole | Deep dive, lost track of time            |

Example header: `# 🎯 Quest: Built auth API — 2026-03-04`

You have the full conversation in context. Extract:

- **What was the goal?** (one line)
- **What actually happened?** (the journey — include messy parts)
- **Roadblocks** — what blocked you, how you got past it
- **Pivots** — when the plan changed and why
- **Dead ends** — approaches that didn't work
- **Aha moments** — when something clicked
- **Key decisions** — what you decided and why
- **What worked** — the solution, the fix, the outcome

### 3. Write the Journal

Pipe your composed entry to the CLI:

```bash
cat <<'EOF' | campsite journal
[Your composed journal content here]
EOF
```

### 4. Write the Working Context

After the journal, write a working context snapshot so the next session can pick up where you left off:

```bash
campsite context "$(cat <<'EOF'
# Working Context

Updated: YYYY-MM-DD

## Handoff

[1-2 sentence summary + immediate next step]

## Continuation Prompt

> "[Ready-to-paste prompt for a fresh session to pick up where this one left off]"

## Active Quests

| Quest        | Status         | Next                    |
| ------------ | -------------- | ----------------------- |
| [Quest name] | 🔄 In Progress | [Immediate next action] |

## Key Files

- `path/to/important/file` — why it matters

## Scratchpad

[Notes, decisions pending, branch info]

🔀 Branch: branch-name
EOF
)"
```

### 5. Mention Open Side Quests

If there are open side quests, mention them in the working context scratchpad or as a note.

## Summary Sections

At the end of the journal, include:

```markdown
## TLDR

|     | Topic        | Time | Summary        |
| --- | ------------ | ---- | -------------- |
| 🎯  | Feature work | 45m  | Added auth API |

## Quest Log

| Quest        | Status         | Next      |
| ------------ | -------------- | --------- |
| Auth Feature | 🔄 In Progress | Add tests |
```

## What to Capture (and What Not To)

**Always include:**

- The journey — not just destination
- Decisions and reasoning
- Dead ends (saves future retries)
- Emotional beats (frustration → relief arcs)

**Skip:**

- File-by-file change lists (git tracks that)
- Play-by-play of routine work
- Code snippets (unless essential to the story)

## Status Indicators

- ✅ Done — Completed
- 🔄 In Progress — Started but not finished (include next step)
- 📋 Parked — Intentionally paused (note why)

## Context Efficiency

**Total tool calls: 3** — status check, write journal, write context.
No reads needed — the conversation is your source.

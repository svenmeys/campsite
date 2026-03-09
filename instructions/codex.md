# Campsite for Codex

## Skills (recommended)

Campsite skills follow the [Agent Skills](https://agentskills.io) open standard — the same `SKILL.md` format that Claude Code and Codex both support. The format is identical; only the discovery path differs (Codex uses `~/.agents/skills/`, Claude Code uses `~/.claude/skills/`).

```bash
# Option 1: Symlink (stays updated with campsite)
ln -s $(npm root -g)/@svenmeys/campsite/skills/* ~/.agents/skills/

# Option 2: Copy to your repo
cp -r $(npm root -g)/@svenmeys/campsite/skills/* .agents/skills/
```

This gives you `/journal`, `/sq`, `/decompose`, and `/ship` — the same behavioral skills Claude Code users get.

## AGENTS.md

Add this to your project's `AGENTS.md` (or `~/.codex/AGENTS.md` for global):

````markdown
## Session Workflow

This project uses `campsite` for persistent session memory. Follow this workflow every session.

### At Session Start

Run `campsite context` before doing any work. This outputs the working context from the last session — what was done, where things left off, and the next step. Use it to orient yourself.

If it returns nothing, this is the first session. Proceed normally.

### During Work

When you notice something unrelated to the current task — a bug, tech debt, a feature idea, "we should also..." — capture it immediately and move on:

```bash
campsite sq "brief description of what you noticed"
```

Do not act on it. Do not discuss it. Do not context-switch. The whole point is capture without interruption.

### At Session End

Two steps. Both are required.

**1. Write a journal** — compose a narrative of what happened (not a file changelog — git tracks that). Include goals, decisions, dead ends, pivots, and outcomes. Pipe it to campsite:

```bash
cat <<'EOF' | campsite journal
# Session Journal

## Goal
[What you set out to do]

## What Happened
[The journey — roadblocks, pivots, dead ends, key decisions, what worked]

## Outcome
[What was accomplished, what's left]

## TLDR

|     | Topic        | Summary        |
| --- | ------------ | -------------- |
| 🎯  | Feature work | Added auth API |

## Quest Log

| Quest        | Status      | Next      |
| ------------ | ----------- | --------- |
| Auth Feature | 🔄 In Progress | Add tests |
EOF
```

**2. Write working context** — a handoff for the next session:

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
[Notes, decisions pending, branch info]
EOF
)"
```

### Behavioral Rules

- **Side quests are sacred.** If anything off-topic comes up during focused work, `campsite sq` it. Never mix unrelated changes into the current task.
- **Journal the journey, not the destination.** Dead ends and pivots are more valuable than "I changed X in Y" — git already tracks that.
- **Working context is a handoff.** Write it as if a different agent will read it cold. Include the continuation prompt.
- **One ticket = one branch = one PR.** If scope grows, use `campsite sq` to capture overflow, don't expand the current task.

### Commands Reference

```
campsite init           Set up stash for current repo
campsite context        Read latest working context
campsite context "text" Write working context (inline)
campsite context -      Write working context (piped stdin)
campsite journal        Write journal (pipe content or --file)
campsite sq "msg"       Capture a side quest
campsite sq done <n>    Remove side quest by number
campsite backlog        List side quests
campsite status         Stash overview
```
````

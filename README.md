# 🏕️ campsite

**Leave every session better than you found it.**

A session workflow toolkit for AI-assisted development. Campsite gives your AI coding agent persistent memory across sessions — journals, working context, and side quest capture — all stored in a **stash** outside your git repos.

Built for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), works with any agent that can run shell commands.

## The Campsite Rule

In hiking, the campsite rule is simple: _leave the campsite better than you found it._

In AI-assisted development, the same principle applies. Every session should:

1. **Start informed** — pick up where you left off (working context)
2. **Stay focused** — capture tangents without acting on them (side quests)
3. **End clean** — log what happened and set up the next session (journal)

Without this, every session starts cold. You re-explain context, re-discover decisions, and lose the thread of multi-session work. Campsite fixes that.

## Concepts

| Term                | What it is                                             | Where it lives                        |
| ------------------- | ------------------------------------------------------ | ------------------------------------- |
| **Stash**           | Project state outside git                              | `~/.campsite/<repo>/`                 |
| **Journal**         | Session journal — the story of what happened           | `~/.campsite/<repo>/journal/`         |
| **Working context** | Handoff state for the next session                     | `~/.campsite/<repo>/working-context/` |
| **Side quest (sq)** | Something to come back to later                        | `~/.campsite/<repo>/backlog.md`       |
| **Plan**            | Decomposed work, bigger side quest docs                | `~/.campsite/<repo>/plans/`           |

## Why a Stash?

The stash lives at `~/.campsite/<repo>/` — **outside** your git repos. This means:

- Survives branch switches and git operations
- Works across worktrees (parallel sessions on different branches)
- Survives fresh clones
- Per-project isolation — no cross-contamination
- Not committed to your repo — personal workflow state stays personal

## Configuration

Campsite stores data at `~/.campsite/<repo>/` by default. To use a different root:

```bash
campsite config stashRoot ~/vault
```

This writes to `~/.campsite/config.json`. The session-start hook respects this setting too.

## Install

```bash
# Requires Bun (https://bun.sh)
bun install -g @svenmeys/campsite
```

## CLI Commands

```bash
campsite init              # Set up stash for current repo
campsite journal           # Write a session journal (pipe or --file)
campsite sq "message"      # Capture a side quest
campsite sq done <n>       # Remove side quest by number
campsite context           # Read latest working context
campsite context "text"    # Write working context (inline)
campsite context -         # Write working context (piped stdin)
campsite context --file F  # Write working context (from file)
campsite status            # Overview of stash
campsite backlog           # Review side quests
campsite hook              # Show session-start hook (standalone)
campsite hook --cli        # Show session-start hook (CLI version)
campsite hook --install    # Install hook into Claude Code settings
campsite config            # Show current config
campsite config key value  # Set a config value
```

### Quick start

```bash
# Set up camp for your project
cd ~/your-project
campsite init

# Capture side quests during work
campsite sq "this query needs an index"
campsite sq "error handling is missing in upload"

# Done with one? Remove it
campsite sq done 1

# Write a journal at session end
echo "# Session Journal\n\nAdded JWT middleware..." | campsite journal

# Write working context for next session
campsite context "Auth API done, need tests next."

# Next session — read the context
campsite context
```

## Claude Code Setup

### Skills (recommended)

Copy or symlink the skills into your Claude Code skills directory:

```bash
# Option 1: Symlink (stays updated with campsite)
ln -s $(npm root -g)/@svenmeys/campsite/skills/* ~/.claude/skills/

# Option 2: Copy
cp -r $(npm root -g)/@svenmeys/campsite/skills/* ~/.claude/skills/
```

This gives you:

- `/journal` — Write a session journal
- `/sq` — Capture a side quest
- `/decompose` — Break work into shippable pieces
- `/ship` — Pre-commit validation checklist

### Session-start hook

Auto-inject your working context at the start of every session:

```bash
campsite hook --install
```

This adds a hook to `~/.claude/settings.json` that runs at session start, showing:

- Latest working context (from last session)
- Active plans
- Open side quest count
- Branch health warnings

## Other Agents (Codex, Cursor, Windsurf, etc.)

Any agent that can run shell commands can use campsite. Add this to your agent's system prompt or rules:

```markdown
## Session Workflow

This project uses campsite for session management.

At session start: run `campsite context` to see where the last session left off.
During work: run `campsite sq "message"` to capture tangents without context switching.
At session end: compose a summary and pipe to `campsite journal`, then write context with `campsite context "handoff notes"`.

See `campsite --help` for all commands.
```

For specific agent instructions, see the `instructions/` directory.

## Stash Structure

```
~/.campsite/
└── <repo-name>/
    ├── journal/              # Session journals — one per session
    │   ├── 2026-03-01-S1.md
    │   ├── 2026-03-01-S2.md
    │   └── 2026-03-02-S1.md  # Counter resets daily
    ├── working-context/      # Handoff snapshots
    │   ├── 2026-03-01-S1.md
    │   └── 2026-03-02-S1.md
    ├── plans/                # Plans + side quest files
    ├── outputs/              # Deliverables
    └── backlog.md            # Side quest log
```

**Session numbering:** Files use `YYYY-MM-DD-S{N}.md` format. The counter resets each day. Session 1 is always `S1`, even if yesterday had 5 sessions.

**Write-only design:** Journal entries and context snapshots are always new files. No reading or appending needed at write time. History is available by reading older files when needed.

## Philosophy

### Done-first, not plan-first

Traditional planning creates guilt when plans don't survive contact with reality. Campsite captures _what actually happened_ — journals over plans.

- Tangents are side quests, not distractions — capture them, don't fight them
- Done lists over todo lists (shows progress, not guilt)
- Journal entries are raw material for changelogs, not status theater

### Designed for ADHD brains

If you or your team members have ADHD, scattered context is the #1 productivity killer. Campsite is designed for brains that:

- Run a hundred threads simultaneously
- Drop things mid-sentence
- Context-switch impulsively (squirrel!)
- Need external structure to compensate

The side quest capture (`/sq`) exists specifically because "oh we should also..." is the ADHD programmer's most dangerous phrase. Capture it, let the brain relax, stay on scope.

### Agent-agnostic by design

The CLI handles the boring stuff (paths, session numbering, file I/O). The agent handles the smart stuff (composing narratives, deciding when to capture). Skills and instructions bridge the gap.

This means campsite works with:

- **Claude Code** — native skills (`/journal`, `/sq`, `/decompose`, `/ship`)
- **Codex** — shell commands in AGENTS.md
- **Cursor** — shell commands in rules
- **Windsurf** — shell commands in rules
- **Aider** — shell commands in conventions
- **Any agent** that can run `campsite <command>`

## License

MIT

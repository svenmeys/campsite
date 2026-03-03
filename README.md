# 🏕️ campsite

**Leave every session better than you found it.**

A session workflow toolkit for AI-assisted development. Campsite gives your AI coding agent persistent memory across sessions — trail logs (journals), trail maps (working context), and cairns (side quest capture) — all stored in a **stash** outside your git repos.

Built for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), works with any agent that can run shell commands.

## The Campsite Rule

In hiking, the campsite rule is simple: *leave the campsite better than you found it.*

In AI-assisted development, the same principle applies. Every session should:

1. **Start informed** — pick up where you left off (trail map)
2. **Stay focused** — capture tangents without acting on them (cairns)
3. **End clean** — log what happened and set up the next session (trail log)

Without this, every session starts cold. You re-explain context, re-discover decisions, and lose the thread of multi-session work. Campsite fixes that.

## Concepts

| Camping term | What it is | Where it lives |
|---|---|---|
| **Stash** | Your gear between hikes — project state outside git | `~/.campsite/<repo>/` |
| **Trail log** | Session journal — the story of what happened | `~/.campsite/<repo>/journal/` |
| **Trail map** | Working context — handoff state for next session | `~/.campsite/<repo>/working-context/` |
| **Cairn** | Stone stack marking something to come back to — side quest | `~/.campsite/<repo>/backlog.md` |
| **Switchbacks** | Breaking a steep climb into manageable pieces — decomposition | `~/.campsite/<repo>/quests/` |
| **Summit check** | Pre-ship validation — are we actually done? | (in-memory checklist) |
| **Route plan** | Decomposed ticket with ordered pieces | `~/.campsite/<repo>/quests/` |

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
bun install -g campsite
```

## CLI Commands

```bash
campsite init              # Pitch your tent — set up stash for current repo
campsite log               # Write a trail log (pipe content from stdin)
campsite sq "message"      # Drop a cairn — capture a side quest
campsite context read      # Show latest trail map
campsite context write     # Save a trail map (pipe content from stdin)
campsite status            # Check camp overview
campsite backlog           # Review trail markers
campsite hook              # Output session-start hook script
campsite hook --install    # Install hook into Claude Code settings
campsite config            # Show current config
campsite config stashRoot ~/vault  # Use custom stash location
```

### Quick start

```bash
# Set up camp for your project
cd ~/your-project
campsite init

# Drop cairns during work (any agent can do this)
campsite sq "this query needs an index"
campsite sq "error handling is missing in upload"

# Write a trail log at session end (agent composes, CLI saves)
echo "# Quest: Built auth API\n\nAdded JWT middleware..." | campsite log --type quest --title "Built auth API"

# Write a trail map for next session
echo "# Working Context\n\n## Handoff\nAuth API done, need tests next." | campsite context write

# Next session — read the trail map
campsite context read
```

## Claude Code Setup

### Skills (recommended)

Copy or symlink the skills into your Claude Code skills directory:

```bash
# Option 1: Symlink (stays updated with campsite)
ln -s $(npm root -g)/campsite/skills/* ~/.claude/skills/

# Option 2: Copy
cp -r $(npm root -g)/campsite/skills/* ~/.claude/skills/
```

This gives you:
- `/journal` — Write a trail log at session end
- `/sq` — Drop a cairn (side quest capture)
- `/decompose` — Plan your switchbacks (break work into pieces)
- `/ship` — Summit check (pre-commit validation)

### Session-start hook

Auto-inject your trail map at the start of every session:

```bash
campsite hook --install
```

This adds a hook to `~/.claude/settings.json` that runs at session start, showing:
- Latest trail map (working context from last session)
- Active route plans (decomposed work)
- Open cairns count
- Branch health warnings

## Other Agents (Codex, Cursor, Windsurf, etc.)

Any agent that can run shell commands can use campsite. Add this to your agent's system prompt or rules:

```markdown
## Session Workflow

This project uses campsite for session management.

At session start: run `campsite context read` to see where the last session left off.
During work: run `campsite sq "message"` to capture tangents without context switching.
At session end: compose a summary and pipe to `campsite log`, then `campsite context write`.

See `campsite --help` for all commands.
```

For specific agent instructions, see the `instructions/` directory.

## Stash Structure

```
~/.campsite/
└── <repo-name>/
    ├── journal/              # Trail logs — one per session
    │   ├── 2026-03-01-S1.md  # Day 1, session 1
    │   ├── 2026-03-01-S2.md  # Day 1, session 2
    │   └── 2026-03-02-S1.md  # Day 2, session 1 (counter resets daily)
    ├── working-context/      # Trail maps — session handoff snapshots
    │   ├── 2026-03-01-S1.md
    │   └── 2026-03-02-S1.md
    ├── quests/               # Route plans — decomposed work
    ├── plans/                # Expedition plans
    ├── outputs/              # Summit photos (deliverables)
    └── backlog.md            # Trail markers (side quests)
```

**Session numbering:** Files use `YYYY-MM-DD-S{N}.md` format. The counter resets each day. Session 1 is always `S1`, even if yesterday had 5 sessions.

**Write-only design:** Journal entries and context snapshots are always new files. No reading or appending needed at write time. History is available by reading older files when needed.

## Philosophy

### Done-first, not plan-first

Traditional planning creates guilt when plans don't survive contact with reality. Campsite captures *what actually happened* — trail logs over route plans.

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

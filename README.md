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

## Agent Setup

### Claude Code

**Skills** — Copy or symlink into your Claude Code skills directory:

```bash
# Symlink (stays updated with campsite)
ln -s $(npm root -g)/@svenmeys/campsite/skills/* ~/.claude/skills/

# Or copy
cp -r $(npm root -g)/@svenmeys/campsite/skills/* ~/.claude/skills/
```

**Session-start hook** — Auto-inject working context at session start:

```bash
campsite hook --install
```

This gives you `/journal`, `/sq`, `/decompose`, `/ship` skills plus automatic context loading.

### Codex

Campsite skills follow the [Agent Skills](https://agentskills.io) open standard — the same `SKILL.md` format that Claude Code uses. Codex discovers them from a different path:

```bash
# Symlink to user skills (Codex looks here, not ~/.claude/skills/)
ln -s $(npm root -g)/@svenmeys/campsite/skills/* ~/.agents/skills/

# Or copy to your repo
cp -r $(npm root -g)/@svenmeys/campsite/skills/* .agents/skills/
```

Add the AGENTS.md template from [`instructions/codex.md`](instructions/codex.md) to your project.

### Cursor

Add the `.mdc` rule from [`instructions/cursor.md`](instructions/cursor.md) to `.cursor/rules/campsite.mdc`.

### Windsurf

Add the rule from [`instructions/windsurf.md`](instructions/windsurf.md) to `.windsurf/rules/campsite.md`.

### Any Other Agent

Any agent that can run shell commands works with campsite. See [`instructions/CAMPSITE.md`](instructions/CAMPSITE.md) for the full workflow, or add the minimal version to your agent's system prompt:

```markdown
## Session Workflow

This project uses campsite for session memory.

At session start: run `campsite context` to see where the last session left off.
During work: run `campsite sq "message"` to capture tangents without context switching.
At session end: compose a journal and pipe to `campsite journal`, then write context with `campsite context "handoff notes"`.
```

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

Campsite skills follow the [Agent Skills](https://agentskills.io) open standard — the same `SKILL.md` format works across tools. The format is portable; only the install path differs:

| Tool | Skills path | Instructions format |
|------|-------------|-------------------|
| **Claude Code** | `~/.claude/skills/` | Native skills + session hook |
| **Codex** | `~/.agents/skills/` | AGENTS.md + skills |
| **Cursor** | n/a (rules only) | `.cursor/rules/campsite.mdc` |
| **Windsurf** | n/a (rules only) | `.windsurf/rules/campsite.md` |
| **Any agent** | n/a | CLI commands in system prompt |

## License

MIT

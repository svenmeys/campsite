# Campsite — Session Workflow

This project uses campsite for persistent session memory.

## At Session Start

Run `campsite context read` to see the trail map from the last session. This tells you:
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

1. **Write a trail log** — compose a narrative of what happened (the journey, not just the destination) and pipe it to:

```bash
cat <<'EOF' | campsite log --type quest --title "What you did"
[Your composed journal content — goal, journey, decisions, outcome]
EOF
```

2. **Write a trail map** — compose a handoff for the next session:

```bash
cat <<'EOF' | campsite context write
# Working Context

## Handoff
[1-2 sentence summary + immediate next step]

## Active Quests
| Quest | Status | Next |
|-------|--------|------|
| [name] | [status] | [next action] |
EOF
```

## Commands Reference

```
campsite init           Set up stash for current repo
campsite sq "msg"       Capture a side quest
campsite log            Write journal (stdin)
campsite context read   Show latest working context
campsite context write  Save working context (stdin)
campsite status         Camp overview
campsite backlog        List side quests
```

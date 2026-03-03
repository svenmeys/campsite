# Campsite for Codex

Add to your `AGENTS.md` or Codex system instructions:

```markdown
## Session Memory

This project uses `campsite` for session persistence.

### Start of task
Run: `campsite context read`
This outputs the working context from the last session. Use it to understand where things left off.

### During work
When you notice something unrelated to the current task:
Run: `campsite sq "brief description"`
Do not act on it. Continue with the current task.

### End of task
1. Compose a summary of what you did and pipe to: `campsite log --type quest --title "summary"`
2. Compose a handoff for next session and pipe to: `campsite context write`
```

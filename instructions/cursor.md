# Campsite for Cursor

Add to `.cursor/rules/campsite.mdc`:

```markdown
---
description: Session workflow using campsite
globs: ["**/*"]
---

# Session Memory

This project uses campsite for persistent session context.

## Start
Run `campsite context` to see where the last session left off.

## During work
If you notice something off-topic, run `campsite sq "description"` and continue.

## End

1. Compose a journal (goal, what happened, decisions, outcome) and pipe to `campsite journal`.
2. Write a handoff: `campsite context "summary of where things stand"`.
```

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
Run `campsite context read` to see where the last session left off.

## During work
If you notice something off-topic, run `campsite sq "description"` and continue.

## End
Compose a summary and pipe to `campsite log --type quest --title "summary"`.
Then compose a handoff and pipe to `campsite context write`.
```

---
name: sq
description: "Drop a cairn — capture a tangent, idea, or noticed problem without context switching. Use when you or the user notices something off-topic during focused work. Examples: 'sq this test is slow', 'sq refactor the auth module', '/sq missing error handling'."
---

# Cairn Drop (Side Quest Capture)

Capture tangents instantly. Don't act on them. Stay on the trail.

Like stacking stones on a hiking trail to mark something worth coming back to.

## When to Use

- User says "sq", "/sq", "side quest", "oh we should also...", "while we're here..."
- You notice something off-topic (broken test, tech debt, missing feature)
- Any time you're about to suggest something outside the current scope

## Behavior

1. Run: `campsite sq "description of the thing you noticed"`
2. **Do not act on it. Do not switch context. Do not discuss it further unless asked.**
3. Confirm with a single line: "Cairn dropped: [summary]"

## Examples

User says: "sq this query is really slow, we should look at it"
→ Run: `campsite sq "Query performance issue to investigate"`
→ Reply: "Cairn dropped: Query performance issue. Back to the trail."

User says: "oh we should also fix the error handling here"
→ Run: `campsite sq "Fix error handling in [file]"`
→ Reply: "Cairn dropped: Error handling fix. Staying on scope."

You notice a code smell while working:
→ Run: `campsite sq "Code smell: [description] in [file]"`
→ Reply: "Cairn dropped: [description]. Continuing."

## Reviewing Cairns

When the user asks to review the backlog:

```bash
campsite backlog
```

Then:
1. Group items by theme
2. Suggest which deserve their own tickets
3. Mark completed items

## Rules

- **Never add more than 2 lines per capture.** If it needs more explanation, it needs its own ticket.
- **Never act on a cairn during focused work.** The whole point is capture without context switch.
- **Always confirm capture.** The user needs to know their thought was saved so their brain can let it go.

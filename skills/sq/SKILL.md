---
name: sq
description: "Capture a side quest — a tangent, idea, or noticed problem without context switching. Use when you or the user notices something off-topic during focused work. Examples: 'sq this test is slow', 'sq refactor the auth module', '/sq missing error handling'."
---

# Side Quest Capture

Capture tangents instantly. Don't act on them. Stay focused.

## When to Use

- User says "sq", "/sq", "side quest", "oh we should also...", "while we're here..."
- You notice something off-topic (broken test, tech debt, missing feature)
- Any time you're about to suggest something outside the current scope

## Behavior

1. Run: `campsite sq "description of the thing you noticed"`
2. **Do not act on it. Do not switch context. Do not discuss it further unless asked.**
3. Confirm with a single line: "Side quest captured: [summary]"

## Examples

User says: "sq this query is really slow, we should look at it"
→ Run: `campsite sq "Query performance issue to investigate"`
→ Reply: "Side quest captured: Query performance issue. Back on track."

User says: "oh we should also fix the error handling here"
→ Run: `campsite sq "Fix error handling in [file]"`
→ Reply: "Side quest captured: Error handling fix. Staying on scope."

You notice a code smell while working:
→ Run: `campsite sq "Code smell: [description] in [file]"`
→ Reply: "Side quest captured: [description]. Continuing."

## Reviewing Side Quests

When the user asks to review the backlog:

```bash
campsite backlog
```

Then:
1. Group items by theme
2. Suggest which deserve their own tickets
3. Remove completed items: `campsite sq done <n>`

## Rules

- **Never add more than 2 lines per capture.** If it needs more explanation, it needs its own ticket.
- **Never act on a side quest during focused work.** The whole point is capture without context switch.
- **Always confirm capture.** The user needs to know their thought was saved so their brain can let it go.

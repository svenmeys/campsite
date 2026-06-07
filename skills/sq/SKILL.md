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

1. Run: `campsite sq "description — why: human-stated reason"`
2. **Do not act on it. Do not switch context. Do not discuss it further unless asked.**
3. Confirm with a single line: "Side quest captured: [summary]"

If the human did not give the why, do not invent one. Either ask one short question if it will not derail the work, or write `why: not stated` plus the factual capture context.

## Side Quest vs Running Notes

Use `campsite sq` for isolated tangents.

Use project-vault `RUNNING_NOTES.md` for the general project scratch log: daily observations, rough ideas, risks, slow-build notes, model smells, UI sparks, and anything useful but not ready to become a task. It is append-first and reviewed later.

Minimal structure:

```markdown
# Running Notes

## Inbox

### YYYY-MM-DD HH:MM — Note title
Tags: #tag #tag
Source: human note | standup | code review | demo work
Status: open

Body. Optional, but include the human why when known.

#### Detail
Use optional note-local subheadings only when useful.

## Reviewed
```

Rules for running notes:

- One project, one `RUNNING_NOTES.md`, stored in that project's vault folder.
- New notes go under `## Inbox`.
- Each note starts with `### YYYY-MM-DD HH:MM — Title`.
- Tags do grouping; do not create many category headings.
- Notes may have `####` subheadings, but only inside one note.
- Move handled notes to `## Reviewed` during triage.

## Examples

User says: "sq this query is really slow, we should look at it"
→ Run: `campsite sq "Query performance issue to investigate — why: human noticed it during current work"`
→ Reply: "Side quest captured: Query performance issue. Back on track."

User says: "oh we should also fix the error handling here"
→ Run: `campsite sq "Fix error handling in [file] — why: not stated; captured during current task"`
→ Reply: "Side quest captured: Error handling fix. Staying on scope."

You notice a code smell while working:
→ Run: `campsite sq "Code smell: [description] in [file] — why: observed while editing [current scope]"`
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
- **Do not fabricate why.** The why must come from the human or existing explicit context. If unknown, say `why: not stated`.
- **Never act on a side quest during focused work.** The whole point is capture without context switch.
- **Always confirm capture.** The user needs to know their thought was saved so their brain can let it go.

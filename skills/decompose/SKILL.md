---
name: decompose
description: "Break a ticket or feature into small, independently shippable pieces. Use when starting a new ticket, when scope feels too big, or when a branch has grown beyond one session's work."
---

# Decompose

Break big work into manageable pieces. Each piece ships independently in 1-2 sessions.

## When to Use

- Starting a new ticket or feature
- Ticket feels too big ("this is going to take a while")
- Branch has grown beyond ~10 commits or ~300 lines
- User says "decompose", "break this down", "how should I split this"
- Proactively when you notice scope creep

## Core Rules

1. **Max 5 pieces.** If you need more, the scope is too big. Flag it.
2. **Each piece ships independently.** It adds value on its own. No piece depends on an unmerged piece.
3. **Each piece is 1-2 sessions of work.** If a piece feels like more, decompose further.
4. **Each piece gets its own branch and PR.** No shared branches.
5. **Order matters.** Ship highest-value, lowest-risk first.

## Process

### Step 1: Understand the Ticket

Read the ticket. If it's a URL, fetch it. If it's a description, clarify with the user.

Ask yourself:
- What's the core value?
- What's the minimum change that delivers it?
- What are the "nice to have" extensions?

### Step 2: Identify Natural Boundaries

Look for:
- **Backend vs Frontend** — Can the API change ship before the UI?
- **Module boundaries** — Does this touch multiple areas? Each is a piece.
- **Data model vs Logic vs UI** — Migration → business logic → UI is a natural 3-piece split.
- **Happy path vs Edge cases** — Ship the happy path first.

### Step 3: Output the Plan

```markdown
## Plan: [Ticket ID] — [Title]

**Goal:** [One sentence — what does the user get?]
**Total pieces:** N
**Estimated sessions:** N

### Piece 1: [Title] (ship first)

**Branch:** `[suggested-branch-name]`
**Scope:** [2-3 bullet points]
**ACs:**
- [ ] [Specific, testable acceptance criterion]
- [ ] [Another one]
**Not included:** [Explicitly deferred to later pieces]

### Piece 2: [Title]

...
```

### Step 4: Save the Plan

Write the plan to the stash:

```bash
cat <<'EOF' | campsite sq
[plan content as markdown]
EOF
```

This saves it to the plans directory and adds a backlog reference.

### Step 5: Side Quest Check

If anything off-topic comes up during decomposition:

```bash
campsite sq "description"
```

Don't act on it — stay on the planning.

## Anti-Patterns to Flag

| Red Flag                           | What to Say                                                  |
| ---------------------------------- | ------------------------------------------------------------ |
| "While we're at it, let's also..." | "That's a side quest. Captured. Back to planning."           |
| Piece has >5 ACs                   | "This piece is too big. Let me break it down further."       |
| Piece touches >3 modules           | "Too much ground for one piece. Let me find a tighter boundary." |
| "We need to refactor X first"      | "Required refactor = Piece 0. Nice-to-have = side quest it." |

## Example

**Ticket:** "Add sorting to all dashboard tables"

**Bad (one giant PR):**
- One branch, 25 commits, 66 files, 3 weeks

**Good (decomposed):**
1. SortableHeaderCell component + sorting infra (design system only)
2. Documents table sorting (one table, proves the pattern)
3. Risks table sorting (including group-aware sorting)
4. Audits + Projects table sorting (same pattern, batch them)
5. Server-side sort support (backend)

Each ships independently. Each is reviewable. Each is <300 lines.

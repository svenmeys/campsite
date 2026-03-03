---
name: ship
description: "Summit check — pre-ship validation checklist. Run before committing, pushing, or declaring 'done'. Catches the mistakes that manual review misses. Use proactively when about to commit, or when the user says 'ship', 'done', 'ready to push'."
---

# Summit Check (Ship Checklist)

Before you plant the flag at the summit, make sure you actually reached the right peak.

Never skip this. Run it BEFORE declaring done, committing, or pushing.

## When to Use

- **Proactively:** Before saying "ready to commit" or "done" — run this FIRST
- **User triggers:** User says "ship", "/ship", "let's commit", "ready to push", "is this done?"
- **Self-check:** When you've been working for a while and want to verify quality

## The Checklist

Run these checks in order. Report results as a pass/fail table. Stop at first critical failure.

### 1. Diff Audit

```bash
git diff --name-only <base-branch>...HEAD
git diff --stat <base-branch>...HEAD
```

Detect the base branch automatically (main, master, beta).

**Check:**
- [ ] Total files changed < 20 (warn if >15, fail if >30)
- [ ] Total lines changed < 500 (warn if >300, fail if >1000)
- [ ] No unrelated files sneaked in
- [ ] No secrets (.env, credentials, tokens)

If the PR is too big, suggest splitting with `/decompose`.

### 2. Lint & Format

Run the project's lint command on changed files. Detect the linter from package.json scripts or config files (oxlint, biome, eslint).

**Check:**
- [ ] Zero lint errors on changed files

### 3. Tests

Determine which test suites to run based on changed files. For targeted runs, find the nearest test file to each changed file.

**Check:**
- [ ] All related tests pass
- [ ] No skipped tests that were previously passing

### 4. Re-read Changed Files

The cognitive check. For each file you changed:

- Re-read the actual file content (not from memory)
- Verify the change does what was intended
- Check for: leftover console.logs, TODO comments, hardcoded values

**Check:**
- [ ] No debug artifacts
- [ ] Changes match the ticket scope

### 5. Pattern Verification

Check for project-specific patterns. Look at the project's `.claude/rules/` or similar config for domain-specific rules relevant to the changed files.

**Check:**
- [ ] Domain patterns followed

### 6. Side Quest Scan

Review the work done this session. Did anything get mixed in that shouldn't be here?

**Check:**
- [ ] All changes relate to the current ticket
- [ ] No scope creep that should be a separate PR

### 7. Branch Health

```bash
git rev-list --count <base-branch>..HEAD
```

**Check:**
- [ ] Commits < 15 (warn if >10)
- [ ] Commit messages are descriptive

## Output Format

```
## Summit Check

| # | Check         | Status | Notes               |
|---|---------------|--------|---------------------|
| 1 | Diff audit    | pass   | 8 files, +142/-37   |
| 2 | Lint          | pass   | Clean               |
| 3 | Tests         | pass   | 12 passed           |
| 4 | Re-read       | warn   | console.log in X    |
| 5 | Patterns      | pass   | All conventions met |
| 6 | Scope check   | pass   | All changes on-topic|
| 7 | Branch health | warn   | 12 commits          |

**Verdict: READY with warnings** — fix console.log before committing.
```

Verdicts:
- **SUMMIT REACHED** — all green, ship it
- **READY with warnings** — minor issues, list them
- **NOT READY** — critical failures, fix first
- **TURN BACK** — PR too big, use `/decompose` to split

## Behavioral Rules

- **Never say "done" without running this first.** Non-negotiable.
- **If checks fail, fix and re-run.** Don't skip.
- **If PR is too big, don't force it.** Split with `/decompose`.
- **The user makes the final call.** Present results, let them decide.
- **Quick mode:** If the user says "quick ship" or "just checks", skip cognitive checks (4, 5, 6) and run only mechanical checks (1, 2, 3, 7).

# Campsite for Codex

Add to your `AGENTS.md` or Codex system instructions:

```markdown
## Session Memory

This project uses `campsite` for session persistence.

### Start of task
Run: `campsite context`
This outputs the working context from the last session. Use it to understand where things left off.

### During work
When you notice something unrelated to the current task:
Run: `campsite sq "brief description"`
Do not act on it. Continue with the current task.

### End of task

1. **Write a journal** — compose a narrative (goal, what happened, decisions, outcome) and pipe it:

    ```bash
    cat <<'EOF' | campsite journal
    # Session Journal
    ## Goal
    [What you set out to do]
    ## What Happened
    [Journey — roadblocks, pivots, dead ends, key decisions]
    ## Outcome
    [What was accomplished, what's left]
    EOF
    ```

2. **Write working context** — handoff for the next session:

    ```bash
    campsite context "Summary of where things stand and what to do next"
    ```
```

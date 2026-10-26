# Dashboard + Plan MVP

Design proposal. The current CLI implements reads and validation only; creation, editing, linking and `--fix` commands below describe proposed work.

## Goal

Add first-class planning to campsite without losing the human-readable `DASHBOARD.md` workflow.

This MVP makes markdown canonical, but not arbitrary. Campsite owns a small markdown contract so humans can read and edit the files directly while the CLI can still perform safe, narrow, token-cheap operations.

## Scope

- `sq` remains raw backlog capture only.
- `DASHBOARD.md` becomes the canonical project dashboard.
- `plans/*.md` become canonical execution-ready plan docs.
- Campsite adds `dashboard` and `plan` commands for section/item-level reads and edits.
- Common operations must work without reading or emitting the full dashboard file.

## Non-Goals

- No generic markdown round-tripping.
- No support for arbitrary dashboard layouts.
- No Linear sync in MVP.
- No stash-managed planning files in MVP.

Session memory stays in the stash. Planning becomes repo-local shared state.

## Canonical Files

- Repo root: `DASHBOARD.md`
- Repo root: `plans/`
- Plan file naming: `plans/PLAN-<n>-<slug>.md`

If `DASHBOARD.md` does not exist, `campsite dashboard init` creates it.

## Concepts

- `sq`: raw inbox. Fast, messy, not yet executable.
- `dashboard item`: tracked work, risk, milestone, or note promoted out of raw backlog.
- `plan`: execution-ready doc for one initiative, ticket, or slice of work.

An item may exist without a plan. A plan may exist without a dashboard item. Linking them is first-class.

## Dashboard Contract

### File-Level Rules

`DASHBOARD.md` must start with frontmatter:

```md
---
schema: campsite-dashboard/v1
updated: 2026-03-18
---
```

Then:

1. One H1 title.
2. Optional intro paragraphs or blockquotes.
3. Any number of H2 sections.
4. Optional H3 subsections inside sections.

### Section Identity

Every managed H2 or H3 must include a stable section marker immediately below the heading:

```md
## Now
<!-- campsite:section id=now -->

### Ship This Week
<!-- campsite:section id=now.ship-this-week -->
```

Heading text may change. Section IDs are the stable machine keys.

### Managed Item Grammar

Within a managed section, campsite recognizes checklist items with this shape:

```md
- [ ] [DB-12] Loosen workspace-owner-only install -- Allow installs by non-owners so other teams can test.
  - plan: [PLAN-3](plans/PLAN-3-non-owner-install.md)
  - ticket: DEMO-123
  - owner: alex
  - due: 2026-03-25
```

Supported first line:

```text
- [ ] [DB-<number>] <title>
- [x] [DB-<number>] <title>
- [ ] [DB-<number>] <title> -- <summary>
- [x] [DB-<number>] <title> -- <summary>
```

Supported metadata lines:

```text
  - plan: [PLAN-<number>](plans/<file>.md)
  - ticket: <external ticket id>
  - owner: <short owner string>
  - due: YYYY-MM-DD
  - source: <free text>
  - labels: comma, separated, labels
```

Rules:

- Item IDs must be unique in the file.
- Checkbox state is the canonical done/not-done state.
- Metadata lines are optional.
- Unknown metadata keys are preserved but ignored by CLI writes in MVP.
- Nested checklists under an item are not supported in MVP.

### Freeform Content

Freeform paragraphs, blockquotes, and bullets are allowed anywhere.

MVP rule: campsite only mutates recognized checklist items inside managed sections. Everything else is preserved and treated as read-only prose.

This allows project dashboards to keep explanatory notes, milestone prose, and non-queue sections without breaking the parser.

## Plan Contract

Each plan is a canonical markdown file with required frontmatter:

```md
---
schema: campsite-plan/v1
id: PLAN-3
title: Non-owner install
status: active
updated: 2026-03-18
ticket: DEMO-123
dashboard:
  - DB-12
---
```

Required body shape:

```md
# PLAN-3: Non-owner install

## Goal

One paragraph.

## Scope

- Included work
- Included work

## Acceptance Criteria

- [ ] Criterion
- [ ] Criterion

## Out of Scope

- Deferred work

## Notes

Freeform markdown.
```

Rules:

- `id` in frontmatter must match the filename prefix and H1.
- `Acceptance Criteria` checkboxes are canonical AC state.
- Additional sections are allowed and preserved.
- Plans are human-editable as long as required sections remain parseable.

## Allowed Direct Edits

Humans and agents may edit markdown directly if they keep the contract intact.

Allowed:

- Rename section headings.
- Reorder sections, subsections, and items.
- Edit item titles and summaries.
- Check or uncheck dashboard items.
- Add or remove supported metadata lines.
- Add new items manually if they follow the item grammar.
- Edit plan prose and acceptance criteria directly.
- Add extra prose blocks that campsite does not manage.

Not supported:

- Removing required frontmatter.
- Duplicating item IDs or plan IDs.
- Removing section marker comments from managed sections.
- Converting managed queues into tables.
- Adding nested checklist structures under dashboard items.
- Renaming a plan file without also updating its `id` and H1.

## Validation Rules

`campsite dashboard lint` checks:

- `DASHBOARD.md` exists and frontmatter is valid.
- Section marker IDs are unique.
- Managed item IDs are unique.
- Metadata links to plans resolve.
- Managed sections are parseable.

`campsite plan lint` checks:

- Plan frontmatter matches filename and H1.
- Required sections exist.
- Linked dashboard items exist.

Failure behavior:

- On parse failure, write commands must fail without modifying files.
- Error output must point to the exact file and line if possible.
- `--fix` may normalize formatting only when the file is already parseable.

## CLI MVP

### Dashboard Commands

Create and validate:

```bash
campsite dashboard init
campsite dashboard lint
campsite dashboard lint --fix
```

Cheap reads:

```bash
campsite dashboard show
campsite dashboard show --section now
campsite dashboard show --section now.ship-this-week --brief
campsite dashboard item DB-12
campsite dashboard item DB-12 --json
```

Writes:

```bash
campsite dashboard add --section now.ship-this-week --title "Loosen workspace-owner-only install"
campsite dashboard edit DB-12 --summary "Allow installs by non-owners"
campsite dashboard move DB-12 --section done.recent
campsite dashboard done DB-12
campsite dashboard reopen DB-12 --section now.ship-this-week
campsite dashboard link DB-12 --plan PLAN-3
```

Behavior:

- `show --brief` returns headings, IDs, checkbox state, title, and key metadata only.
- `show --json` returns structured section/item objects.
- `done` checks the item and leaves it in place unless `--section` is also passed.

### Plan Commands

Create and validate:

```bash
campsite plan create --title "Non-owner install"
campsite plan lint
campsite plan lint PLAN-3
```

Cheap reads:

```bash
campsite plan show PLAN-3
campsite plan show PLAN-3 --brief
campsite plan show PLAN-3 --json
```

Writes:

```bash
campsite plan link PLAN-3 --dashboard DB-12
campsite plan unlink PLAN-3 --dashboard DB-12
```

Behavior:

- `plan create` allocates the next `PLAN-<n>` ID, creates the file, and writes a template.
- `plan show --brief` returns title, status, ticket, linked dashboard items, and AC counts only.
- `plan link` updates both the plan frontmatter and the dashboard item metadata.

## ID Allocation

- Dashboard IDs are allocated by scanning `DASHBOARD.md` for the highest `DB-<n>`.
- Plan IDs are allocated by scanning `plans/` for the highest `PLAN-<n>`.
- Deleted IDs are not reused.

## Markdown Examples

### Dashboard Example

```md
---
schema: campsite-dashboard/v1
updated: 2026-03-18
---

# Dashboard

> Active work queues. What's happening now.

## Now
<!-- campsite:section id=now -->

### Ship This Week
<!-- campsite:section id=now.ship-this-week -->

- [ ] [DB-12] Loosen workspace-owner-only install -- Allow installs by non-owners so other teams can test.
  - plan: [PLAN-3](plans/PLAN-3-non-owner-install.md)
  - ticket: DEMO-123
  - owner: alex

### Tier 0
<!-- campsite:section id=now.tier-0 -->

- [ ] [DB-13] Verify database backups

## Done
<!-- campsite:section id=done -->

### Recent
<!-- campsite:section id=done.recent -->

- [x] [DB-8] Ship pricing link
```

### Plan Example

```md
---
schema: campsite-plan/v1
id: PLAN-3
title: Non-owner install
status: active
updated: 2026-03-18
ticket: DEMO-123
dashboard:
  - DB-12
---

# PLAN-3: Non-owner install

## Goal

Allow non-owner installs so teams outside the workspace owner can test the app.

## Scope

- Relax install permission gate
- Preserve existing admin checks for destructive actions

## Acceptance Criteria

- [ ] Non-owner can install successfully
- [ ] Existing permission guards still pass

## Out of Scope

- Marketplace packaging

## Notes

Check whether provider install callbacks assume owner-only authorization.
```

## Future Extensions

Not in MVP, but planned:

- `campsite linear pull`
- `campsite ticket log <ticket-id> "note"`
- Dashboard sections backed by external ticket filters
- Sync status fields between markdown and Linear

## Implementation Notes

- Use a markdown AST parser, not regex-only editing.
- Writes should be scoped to one file and one item/section at a time.
- Preserve formatting and surrounding prose whenever possible.
- If a section contains unsupported markdown, campsite should still read the rest of the file and only fail when a write targets the unsupported block.

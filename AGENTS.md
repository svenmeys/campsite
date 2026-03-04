# Campsite

Session workflow toolkit for AI-assisted development. Bun + TypeScript CLI, zero dependencies.

## Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict mode via tsgo)
- **Linting:** oxlint (complexity ≤ 10, no classes)
- **Testing:** bun:test

## Commands

```bash
bun test             # Run tests
bun run typecheck    # Type check with tsgo
bun run lint         # Lint with oxlint
```

## Architecture

```
src/
├── index.ts          # CLI entry + command routing
├── commands/
│   ├── init.ts       # campsite init (first-run setup)
│   ├── journal.ts    # campsite journal (pipe-to-file writer)
│   ├── sq.ts         # campsite sq (numbered backlog + plan files)
│   ├── context.ts    # campsite context (read/write working context)
│   ├── status.ts     # campsite status
│   ├── config.ts     # campsite config
│   └── hook.ts       # campsite hook (standalone + CLI variants)
└── lib/
    ├── args.ts       # Flag parsing + stdin helpers
    ├── config.ts     # Config (~/.campsite/config.json), env var overrides
    ├── session.ts    # Session numbering (YYYY-MM-DD-S{N})
    └── stash.ts      # Stash path resolution + directory management
```

## Conventions

- Pure functions, no classes
- `Bun.write()` for async writes, `writeFileSync` for sync contexts
- `Bun.readableStreamToText(Bun.stdin.stream())` for stdin
- No external dependencies
- Env vars `CAMPSITE_STASH_ROOT` / `CAMPSITE_CONFIG_DIR` for testing

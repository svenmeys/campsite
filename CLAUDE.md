# Campsite

Session workflow toolkit for AI-assisted development. Bun + TypeScript CLI.

## Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict mode)
- **Type checking:** tsgo (`@typescript/native-preview`)
- **Linting:** oxlint
- **No frameworks** — pure Bun APIs + node:fs/node:path

## Commands

```bash
bun run dev          # Run CLI locally
bun run typecheck    # Type check with tsgo
bun run lint         # Lint with oxlint
```

## Architecture

```
src/
├── index.ts          # CLI entry point + command routing
├── commands/         # One file per command
│   ├── init.ts       # campsite init
│   ├── log.ts        # campsite log
│   ├── sq.ts         # campsite sq
│   ├── context.ts    # campsite context read/write
│   ├── status.ts     # campsite status
│   ├── backlog.ts    # campsite backlog
│   └── hook.ts       # campsite hook
└── lib/
    ├── stash.ts      # Stash path resolution + directory management
    └── session.ts    # Session numbering (YYYY-MM-DD-S{N})
```

## Conventions

- Pure functions where possible
- No classes (oxlint enforces max-classes-per-file: 0)
- Max 75 lines per function, max 300 lines per file
- Use `Bun.write()` over `node:fs` writeFile where practical
- Use `Bun.readableStreamToText(Bun.stdin.stream())` for stdin
- No external dependencies — stdlib only

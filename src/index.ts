#!/usr/bin/env bun

/**
 * 🏕️ campsite — Leave every session better than you found it.
 *
 * Session workflow toolkit for AI-assisted development.
 * Your stash lives outside git repos, surviving branch switches and worktrees.
 */

import { init } from "./commands/init.ts";
import { log } from "./commands/log.ts";
import { sq } from "./commands/sq.ts";
import { context } from "./commands/context.ts";
import { status } from "./commands/status.ts";
import { backlog } from "./commands/backlog.ts";
import { hook } from "./commands/hook.ts";
import { config } from "./commands/config.ts";

const [command, ...args] = process.argv.slice(2);

const HELP = `
🏕️  campsite — Leave every session better than you found it.

Usage: campsite <command> [options]

Commands:
  init              Pitch your tent — set up stash for current repo
  log               Write a trail log (journal entry)
  sq <message>      Drop a cairn — capture a side quest
  context           Read or write trail maps (working context)
  status            Check camp — overview of your stash
  backlog           Review trail markers (side quest backlog)
  hook              Output session-start hook for Claude Code
  config            View or set campsite settings

Options:
  --help, -h        Show this help
  --version, -v     Show version

Stash location: ~/.campsite/<repo>/
`;

const commands: Record<string, (args: string[]) => Promise<void> | void> = {
  init,
  log,
  sq,
  context,
  status,
  backlog,
  hook,
  config,
};

if (!command || command === "--help" || command === "-h") {
  console.log(HELP);
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log("campsite v0.1.0");
  process.exit(0);
}

const handler = commands[command];
if (!handler) {
  console.error(`Unknown command: ${command}\nRun 'campsite --help' for usage.`);
  process.exit(1);
}

await handler(args);

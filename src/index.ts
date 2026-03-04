#!/usr/bin/env bun

import { init } from "./commands/init.ts";
import { journal } from "./commands/journal.ts";
import { sq } from "./commands/sq.ts";
import { context } from "./commands/context.ts";
import { status } from "./commands/status.ts";
import { hook } from "./commands/hook.ts";
import { config } from "./commands/config.ts";

const HELP = `🏕️  campsite — Leave every session better than you found it.

Usage: campsite <command> [options]

  init              Set up stash for current repo
  journal           Write a session journal (pipe or --file)
  sq <message>      Capture a side quest
  sq done <n>       Remove side quest by number
  context           Read latest working context
  context <text>    Write context (inline text)
  context -         Write context (piped stdin)
  context --file F  Write context (from file)
  status            Overview
  backlog           Review side quests
  hook              Show session-start hook (standalone)
  hook --cli        Show session-start hook (uses campsite CLI)
  hook --install    Install standalone hook into Claude Code
  hook --install --cli  Install CLI hook into Claude Code
  config            View or set settings

  --help, -h        Show this help
  --version, -v     Show version`;

const commands: Record<string, (args: string[]) => Promise<void> | void> = {
  init,
  journal,
  log: journal,
  sq,
  context,
  status,
  backlog: (args) => sq(["review", ...args]),
  hook,
  config,
};

const [command, ...args] = process.argv.slice(2);

if (!command || command === "--help" || command === "-h") {
  console.log(HELP);
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  const pkg = await import("../package.json");
  console.log(`campsite v${pkg.version}`);
  process.exit(0);
}

const handler = commands[command];
if (!handler) {
  console.error(`Unknown: ${command}. Run 'campsite --help'`);
  process.exit(1);
}

await handler(args);

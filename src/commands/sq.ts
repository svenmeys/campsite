/**
 * campsite sq — Drop a cairn.
 *
 * Captures a side quest (tangent, idea, noticed problem) without context switching.
 * Like stacking stones on the trail to mark something worth coming back to.
 *
 * Usage:
 *   campsite sq "this query is really slow"
 *   campsite sq "refactor the auth module"
 *   campsite sq review              # List all trail markers
 */

import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { stashDir, getRepoName, getBranch, pitchTent } from "../lib/stash.ts";
import { today, now } from "../lib/session.ts";

export function sq(args: string[]): void {
  const repo = getRepoName();

  if (args[0] === "review") {
    reviewBacklog(repo);
    return;
  }

  const message = args.join(" ").trim();
  if (!message) {
    console.error("What did you notice? Pass a message:");
    console.error('  campsite sq "this query is really slow"');
    process.exit(1);
  }

  if (!existsSync(stashDir(repo))) {
    pitchTent(repo);
  }

  const backlogPath = join(stashDir(repo), "backlog.md");
  const branch = getBranch();
  const entry = `- [ ] [${today()} ${now()}] ${message} _(spotted on \`${branch}\`)_\n`;

  appendFileSync(backlogPath, entry);
  console.log(`🪨 Cairn dropped: ${message}`);
}

function reviewBacklog(repo: string): void {
  const backlogPath = join(stashDir(repo), "backlog.md");

  if (!existsSync(backlogPath)) {
    console.log("No trail markers found. Drop one with: campsite sq \"message\"");
    return;
  }

  const content = readFileSync(backlogPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.startsWith("- ["));
  const open = lines.filter((l) => l.startsWith("- [ ]"));
  const done = lines.filter((l) => l.startsWith("- [x]"));

  console.log(`🪨 Trail markers for "${repo}"\n`);
  if (open.length > 0) {
    console.log(`Open (${open.length}):`);
    for (const line of open) console.log(`  ${line}`);
  }
  if (done.length > 0) {
    console.log(`\nDone (${done.length}):`);
    for (const line of done) console.log(`  ${line}`);
  }
  if (lines.length === 0) {
    console.log("Trail is clean — no markers.");
  }
}

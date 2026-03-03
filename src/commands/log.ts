/**
 * campsite log — Write a trail log.
 *
 * Saves a journal entry for the current session.
 * Content comes from stdin (piped from agent) or --file flag.
 *
 * Usage:
 *   echo "journal content" | campsite log
 *   campsite log --file /tmp/journal.md
 *   campsite log --type quest --title "Built auth API"
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stashPath, getRepoName, pitchTent } from "../lib/stash.ts";
import { nextSession, sessionFilename, today, now } from "../lib/session.ts";

export async function log(args: string[]): Promise<void> {
  const repo = getRepoName();
  if (!existsSync(stashPath("journal", repo))) {
    pitchTent(repo);
  }

  const type = flagValue(args, "--type") ?? "quest";
  const title = flagValue(args, "--title") ?? "Session log";
  const filePath = flagValue(args, "--file");

  let content: string;

  if (filePath) {
    content = readFileSync(filePath, "utf-8");
  } else if (!process.stdin.isTTY) {
    content = await readStdin();
  } else {
    console.error("No content provided. Pipe content or use --file <path>");
    console.error("  echo 'journal content' | campsite log");
    console.error("  campsite log --file /tmp/journal.md");
    process.exit(1);
  }

  const sessionNum = nextSession("journal", repo);
  const filename = sessionFilename(sessionNum);
  const dir = stashPath("journal", repo);
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, filename);

  const emoji = TYPE_EMOJI[type] ?? "🎯";
  const header = `# ${emoji} ${capitalize(type)}: ${title} — ${today()} ${now()}\n\n`;
  const full = content.startsWith("#") ? content : header + content;

  await Bun.write(outPath, full);
  console.log(`📝 Trail log written: ${filename} (session S${sessionNum})`);
  console.log(`   ${outPath}`);
}

const TYPE_EMOJI: Record<string, string> = {
  quest: "🎯",
  shiny: "✨",
  squirrel: "🐿️",
  "rabbit-hole": "🕳️",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function flagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

async function readStdin(): Promise<string> {
  return await Bun.readableStreamToText(Bun.stdin.stream());
}

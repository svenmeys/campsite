/**
 * campsite context — Read or write your trail map.
 *
 * Working context snapshots that tell you where you are on the trail.
 * Read the latest one to pick up where you left off.
 * Write a new one when you're done hiking for the day.
 *
 * Usage:
 *   campsite context read                    # Output latest context to stdout
 *   campsite context write --file /tmp/ctx   # Save context from file
 *   echo "context" | campsite context write  # Save context from stdin
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stashPath, getRepoName, pitchTent } from "../lib/stash.ts";
import { nextSession, sessionFilename } from "../lib/session.ts";

export async function context(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === "write") {
    await writeContext(args.slice(1));
  } else if (subcommand === "read" || !subcommand) {
    readContext();
  } else {
    console.error(`Unknown subcommand: ${subcommand}`);
    console.error("Usage: campsite context [read|write]");
    process.exit(1);
  }
}

function readContext(): void {
  const repo = getRepoName();
  const dir = stashPath("working-context", repo);

  if (!existsSync(dir)) {
    console.error(`No camp found for "${repo}". Run: campsite init`);
    process.exit(1);
  }

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log(`No trail maps yet for "${repo}". Write one after your session.`);
    return;
  }

  const latest = files[0]!;
  const content = readFileSync(join(dir, latest), "utf-8");
  process.stdout.write(content);
}

async function writeContext(args: string[]): Promise<void> {
  const repo = getRepoName();
  if (!existsSync(stashPath("working-context", repo))) {
    pitchTent(repo);
  }

  const filePath = flagValue(args, "--file");
  let content: string;

  if (filePath) {
    content = readFileSync(filePath, "utf-8");
  } else if (!process.stdin.isTTY) {
    content = await readStdin();
  } else {
    console.error("No content. Pipe content or use --file <path>");
    process.exit(1);
  }

  const sessionNum = nextSession("working-context", repo);
  const filename = sessionFilename(sessionNum);
  const dir = stashPath("working-context", repo);
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, filename);

  await Bun.write(outPath, content);
  console.log(`🗺️  Trail map saved: ${filename} (session S${sessionNum})`);
  console.log(`   ${outPath}`);
}

function flagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

async function readStdin(): Promise<string> {
  return await Bun.readableStreamToText(Bun.stdin.stream());
}

/**
 * campsite status — Check camp.
 *
 * Shows an overview of your stash: latest trail log, trail map, open cairns, branch health.
 * Like doing a morning check of your campsite before heading out.
 *
 * Usage:
 *   campsite status           # Full camp check
 *   campsite status --brief   # One-liner for hooks
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  stashDir,
  stashPath,
  getRepoName,
  getBranch,
  stashExists,
} from "../lib/stash.ts";
import { today } from "../lib/session.ts";

export function status(args: string[]): void {
  const repo = getRepoName();
  const brief = args.includes("--brief");

  if (!stashExists(repo)) {
    if (brief) {
      console.log(`No camp for ${repo}`);
    } else {
      console.log(`No camp set up for "${repo}". Run: campsite init`);
    }
    return;
  }

  const branch = getBranch();
  const journalCount = countFiles(stashPath("journal", repo));
  const contextCount = countFiles(stashPath("working-context", repo));
  const todayJournals = countTodayFiles(stashPath("journal", repo));
  const openCairns = countOpenCairns(repo);
  const latestContext = getLatestFile(stashPath("working-context", repo));
  const latestJournal = getLatestFile(stashPath("journal", repo));

  if (brief) {
    const parts = [`🏕️ ${repo}`, `📝 ${todayJournals} today`, `🪨 ${openCairns} cairns`];
    console.log(parts.join(" | "));
    return;
  }

  console.log(`🏕️  Camp: ${repo}`);
  console.log(`🔀 Branch: ${branch}`);
  console.log(`📍 Stash: ${stashDir(repo)}`);
  console.log("");
  console.log(`📝 Trail logs: ${journalCount} total, ${todayJournals} today`);
  if (latestJournal) console.log(`   Latest: ${latestJournal}`);
  console.log(`🗺️  Trail maps: ${contextCount} total`);
  if (latestContext) console.log(`   Latest: ${latestContext}`);
  console.log(`🪨 Open cairns: ${openCairns}`);

  const questCount = countFiles(stashPath("quests", repo));
  if (questCount > 0) console.log(`🥾 Route plans: ${questCount}`);
}

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".md")).length;
}

function countTodayFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  const date = today();
  return readdirSync(dir).filter((f) => f.startsWith(date)).length;
}

function getLatestFile(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();
  return files[0] ?? null;
}

function countOpenCairns(repo: string): number {
  const backlogPath = join(stashDir(repo), "backlog.md");
  if (!existsSync(backlogPath)) return 0;
  const content = readFileSync(backlogPath, "utf-8");
  return (content.match(/^- \[ \]/gm) ?? []).length;
}

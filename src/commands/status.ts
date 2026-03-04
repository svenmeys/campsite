import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stashDir, stashPath, getRepoName, getBranch } from "../lib/stash.ts";
import { today } from "../lib/session.ts";

export function status(args: string[]): void {
  const repo = getRepoName();
  const dir = stashDir(repo);

  if (!existsSync(dir)) {
    console.log(`No stash for "${repo}". Run: campsite init`);
    return;
  }

  const brief = args.includes("--brief");
  const todayLogs = countByPrefix(stashPath("journal", repo), today());
  const openSq = countOpenSideQuests(join(dir, "backlog.md"));

  if (brief) {
    console.log(`🏕️ ${repo} | 📝 ${todayLogs} today | 📌 ${openSq} side quests`);
    return;
  }

  const journalDir = stashPath("journal", repo);
  const contextDir = stashPath("working-context", repo);

  console.log(`🏕️  ${repo} (${getBranch()})`);
  console.log(`📍 ${dir}`);
  console.log(`📝 Journals: ${countMd(journalDir)} total, ${todayLogs} today`);
  console.log(`🗺️  Context: ${countMd(contextDir)} total`);
  console.log(`📌 Side quests: ${openSq} open`);

  const plans = countMd(stashPath("plans", repo));
  if (plans > 0) console.log(`📋 Plans: ${plans}`);
}

function countMd(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".md")).length;
}

function countByPrefix(dir: string, prefix: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.startsWith(prefix)).length;
}

function countOpenSideQuests(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf-8").split("\n").filter((l) => /^\d+ /.test(l)).length;
}

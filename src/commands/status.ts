import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stashDir, stashPath, getRepoName, getBranch } from "../lib/stash.ts";
import { today } from "../lib/session.ts";

export function status(args: string[]): void {
  const repo = getRepoName();
  const dir = stashDir(repo);
  const json = args.includes("--json");

  if (!existsSync(dir)) {
    if (json) {
      console.log(JSON.stringify(emptyStatus(repo, dir), null, 2));
      return;
    }
    console.log(`No stash for "${repo}". Run: campsite init`);
    return;
  }

  const brief = args.includes("--brief");
  const todayLogs = countByPrefix(stashPath("journal", repo), today());
  const openSq = countOpenSideQuests(join(dir, "backlog.md"));
  const plans = countMd(stashPath("plans", repo));

  if (json) {
    console.log(JSON.stringify({
      repo,
      branch: getBranch(),
      stashDir: dir,
      exists: true,
      journals: { total: countMd(stashPath("journal", repo)), today: todayLogs },
      workingContext: { total: countMd(stashPath("working-context", repo)) },
      sideQuests: { open: openSq },
      plans: { total: plans },
    }, null, 2));
    return;
  }

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

  if (plans > 0) console.log(`📋 Plans: ${plans}`);
}

function emptyStatus(repo: string, dir: string) {
  return {
    repo,
    branch: getBranch(),
    stashDir: dir,
    exists: false,
    journals: { total: 0, today: 0 },
    workingContext: { total: 0 },
    sideQuests: { open: 0 },
    plans: { total: 0 },
  };
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

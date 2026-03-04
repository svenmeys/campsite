import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stashDir, getRepoName, getBranch, ensureStash } from "../lib/stash.ts";
import { today, nextSession } from "../lib/session.ts";
import { readStdin } from "../lib/args.ts";

function backlogPath(repo: string): string {
  return join(stashDir(repo), "backlog.md");
}

function readEntries(repo: string): string[] {
  const path = backlogPath(repo);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8").split("\n").filter((l) => /^\d+ /.test(l));
}

function writeEntries(repo: string, entries: string[]): void {
  const numbered = entries.map((e, i) => `${i + 1} ${e.replace(/^\d+ /, "")}`);
  writeFileSync(backlogPath(repo), numbered.join("\n") + (numbered.length ? "\n" : ""));
}

function addEntry(repo: string, text: string): number {
  ensureStash(repo);
  const entries = readEntries(repo);
  const n = entries.length + 1;
  entries.push(`${n} ${text}`);
  writeEntries(repo, entries);
  return n;
}

function done(repo: string, id: string): void {
  const n = parseInt(id, 10);
  const entries = readEntries(repo);
  if (isNaN(n) || n < 1 || n > entries.length) {
    console.error(`No side quest #${id}. Run: campsite backlog`);
    process.exit(1);
  }
  const removed = entries[n - 1]?.replace(/^\d+ /, "") ?? "";
  entries.splice(n - 1, 1);
  writeEntries(repo, entries);
  console.log(`✅ Done: ${removed}`);
}

function review(repo: string): void {
  const entries = readEntries(repo);
  if (entries.length === 0) {
    console.log("No side quests.");
    return;
  }
  for (const line of entries) console.log(`  ${line}`);
}

export async function sq(args: string[]): Promise<void> {
  const repo = getRepoName();

  if (args[0] === "done" && args[1]) return done(repo, args[1]);
  if (args[0] === "review") return review(repo);

  const message = args.join(" ").trim();
  if (message) {
    const n = addEntry(repo, `${message} [${getBranch()}] ${today()}`);
    console.log(`📌 #${n} ${message}`);
    return;
  }

  if (!process.stdin.isTTY) {
    const content = await readStdin();
    if (content.trim()) {
      await writePlan(repo, content);
      return;
    }
  }

  console.error('Usage: campsite sq "message" | campsite sq done <n>');
  process.exit(1);
}

async function writePlan(repo: string, content: string): Promise<void> {
  ensureStash(repo);
  const s = nextSession("plans", repo);
  const filename = `${today()}-S${s}.md`;
  await Bun.write(join(stashDir(repo), "plans", filename), content);

  const n = addEntry(repo, `plans/${filename} [${getBranch()}] ${today()}`);
  console.log(`📌 #${n} → plans/${filename}`);
}

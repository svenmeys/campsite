import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stashDir, getRepoName, getBranch, ensureStash } from "../lib/stash.ts";
import { today, nextSession } from "../lib/session.ts";
import { readStdin } from "../lib/args.ts";

function backlogPath(repo: string): string {
  return join(stashDir(repo), "backlog.md");
}

interface Entry {
  id: number;
  text: string;
}

interface Backlog {
  nextId: number;
  entries: Entry[];
}

function readBacklog(repo: string): Backlog {
  const path = backlogPath(repo);
  if (!existsSync(path)) return { nextId: 1, entries: [] };
  const raw = readFileSync(path, "utf-8");

  let nextId = 1;
  let body = raw;
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const idMatch = fmMatch[1]!.match(/^next_id:\s*(\d+)/m);
    if (idMatch) nextId = Number(idMatch[1]);
    body = fmMatch[2] ?? "";
  }

  const entries = body
    .split("\n")
    .filter((l) => /^\d+ /.test(l))
    .map((l) => {
      const match = l.match(/^(\d+) (.*)$/)!;
      return { id: Number(match[1]), text: match[2]! };
    });

  // Handle legacy files without front matter
  if (!fmMatch && entries.length > 0) {
    nextId = Math.max(...entries.map((e) => e.id)) + 1;
  }

  return { nextId, entries };
}

function writeBacklog(repo: string, backlog: Backlog): void {
  const lines = backlog.entries.map((e) => `${e.id} ${e.text}`);
  const fm = `---\nnext_id: ${backlog.nextId}\n---\n`;
  writeFileSync(backlogPath(repo), fm + lines.join("\n") + (lines.length ? "\n" : ""));
}

function addEntry(repo: string, text: string): number {
  ensureStash(repo);
  const backlog = readBacklog(repo);
  const id = backlog.nextId;
  backlog.entries.push({ id, text });
  backlog.nextId = id + 1;
  writeBacklog(repo, backlog);
  return id;
}

function done(repo: string, id: string): void {
  const n = parseInt(id, 10);
  const backlog = readBacklog(repo);
  const idx = backlog.entries.findIndex((e) => e.id === n);
  if (isNaN(n) || idx === -1) {
    console.error(`No side quest #${id}. Run: campsite backlog`);
    process.exit(1);
  }
  const removed = backlog.entries[idx]!.text;
  backlog.entries.splice(idx, 1);
  writeBacklog(repo, backlog);
  console.log(`✅ Done: ${removed}`);
}

function review(repo: string): void {
  const { entries } = readBacklog(repo);
  if (entries.length === 0) {
    console.log("No side quests.");
    return;
  }
  for (const e of entries) console.log(`  ${e.id} ${e.text}`);
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

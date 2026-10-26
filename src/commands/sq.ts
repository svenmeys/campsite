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
  group?: string;
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
      const tag = match[2]!.match(/^\[group:([^\]\r\n]+)\] (.*)$/);
      return { id: Number(match[1]), text: tag ? tag[2]! : match[2]!, group: tag?.[1] };
    });

  // Handle legacy files without front matter
  if (!fmMatch && entries.length > 0) {
    nextId = Math.max(...entries.map((e) => e.id)) + 1;
  }

  return { nextId, entries };
}

function writeBacklog(repo: string, backlog: Backlog): void {
  const lines = backlog.entries.map((e) => `${e.id} ${e.group ? `[group:${e.group}] ` : ""}${e.text}`);
  const fm = `---\nnext_id: ${backlog.nextId}\n---\n`;
  writeFileSync(backlogPath(repo), fm + lines.join("\n") + (lines.length ? "\n" : ""));
}

function addEntry(repo: string, text: string, group?: string): number {
  ensureStash(repo);
  const backlog = readBacklog(repo);
  const id = backlog.nextId;
  backlog.entries.push({ id, text, group });
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

const USAGE = `Usage: campsite sq "multi-word message"
  campsite sq --group <name> "multi-word message"
  campsite sq list [group]       List by group (ungrouped last)
  campsite sq review [group]     Alias for list
  campsite sq group <n> <name>   Set or move group
  campsite sq group <n> --none   Clear group
  campsite sq done <n>          Remove quest
  cat plan.md | campsite sq     Save a plan

Capture requires exactly one quoted, single-line argument with at least two words.
Bare words, unknown flags and unquoted command-like sequences fail (including help,
--help, -h and show). Group names may contain spaces; quote them. Names cannot
start with '-' or contain brackets or line breaks. IDs are positive integers.`;

function usage(): never {
  console.error(USAGE);
  process.exit(1);
}

function validGroup(name: string | undefined): name is string {
  return !!name && name.trim() === name && !/^[-]|[[\]\r\n]/.test(name);
}

function validId(id: string | undefined): id is string {
  return !!id && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
}

function regroup(repo: string, id: string, group?: string): void {
  const backlog = readBacklog(repo);
  const entry = backlog.entries.find((e) => e.id === Number(id));
  if (!entry) {
    console.error(`No side quest #${id}. Run: campsite sq list`);
    process.exit(1);
  }
  entry.group = group;
  writeBacklog(repo, backlog);
  console.log(`📌 #${id} → ${group ?? "Ungrouped"}`);
}

function review(repo: string, group?: string): void {
  const { entries } = readBacklog(repo);
  const selected = group === undefined ? entries : entries.filter((e) => e.group === group);
  if (selected.length === 0) {
    console.log("No side quests.");
    return;
  }
  const groups = [...new Set(selected.map((e) => e.group).filter((g) => g !== undefined))].sort();
  for (const name of [...groups, undefined]) {
    const members = selected.filter((e) => e.group === name);
    if (!members.length) continue;
    console.log(`${name ?? "Ungrouped"}:`);
    for (const e of members) console.log(`  ${e.id} ${e.text}`);
  }
}

function capture(repo: string, input: string[]): void {
  let args = input;
  let group: string | undefined;
  if (args[0] === "--group") {
    if (!validGroup(args[1])) usage();
    group = args[1];
    args = args.slice(2);
  }
  const message = args[0]?.trim() ?? "";
  if (args.length !== 1 || !/\S+[^\S\r\n]+\S+/.test(message) || /[\r\n]/.test(message) || message.startsWith("-")) usage();
  const n = addEntry(repo, `${message} [${getBranch()}] ${today()}`, group);
  console.log(`📌 #${n} ${message}`);
}

function groupCommand(repo: string, args: string[]): void {
  if (args.length !== 3 || !validId(args[1])) usage();
  if (args[2] !== "--none" && !validGroup(args[2])) usage();
  regroup(repo, args[1], args[2] === "--none" ? undefined : args[2]);
}

function listCommand(repo: string, args: string[]): void {
  if (args.length > 2 || (args.length === 2 && !validGroup(args[1]))) usage();
  review(repo, args[1]);
}

function command(repo: string, args: string[]): void {
  switch (args[0]) {
    case "done":
      if (args.length !== 2 || !validId(args[1])) usage();
      return done(repo, args[1]);
    case "list":
    case "review":
      return listCommand(repo, args);
    case "group":
      return groupCommand(repo, args);
    default:
      return capture(repo, args);
  }
}

export async function sq(args: string[]): Promise<void> {
  const repo = getRepoName();
  if (args.length) return command(repo, args);
  if (!process.stdin.isTTY) {
    const content = await readStdin();
    if (content.trim()) return writePlan(repo, content);
  }
  usage();
}

async function writePlan(repo: string, content: string): Promise<void> {
  ensureStash(repo);
  const s = nextSession("plans", repo);
  const filename = `${today()}-S${s}.md`;
  await Bun.write(join(stashDir(repo), "plans", filename), content);

  const n = addEntry(repo, `plans/${filename} [${getBranch()}] ${today()}`);
  console.log(`📌 #${n} → plans/${filename}`);
}

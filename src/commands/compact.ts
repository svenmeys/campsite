import { existsSync, readdirSync, readFileSync, unlinkSync, renameSync } from "node:fs";
import { join, basename } from "node:path";
import { getStashRoot } from "../lib/config.ts";
import { parseFrontmatter, frontmatterValue } from "../lib/frontmatter.ts";

export const COMPACT_HELP = `Usage: campsite compact [options]

Merge same-day session journals and delete empty session files.

Options:
  --dry-run        Preview without changes
  --help, -h      Show this help`;

/** Strip surrounding YAML quotes from a value */
function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/** Parse a frontmatter field that could be an array (inline [a, b] or multi-line) or a string */
function getList(data: Record<string, string | string[]>, key: string): string[] {
  const value = data[key];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  // Handle inline YAML arrays like [foo, bar]
  const match = value.match(/^\[(.+)]$/);
  if (match) return match[1]!.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

interface JournalFile {
  path: string;
  filename: string;
  date: string;
  session: number;
  body: string;
  data: Record<string, string | string[]>;
  empty: boolean;
}

/** Check if a journal file has no meaningful body content */
function isEmpty(body: string): boolean {
  return body.trim().length === 0;
}

/** Parse a session journal filename → date + session number */
function parseSessionFilename(filename: string): { date: string; session: number } | undefined {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-S(\d+)\.md$/);
  if (!match) return undefined;
  return { date: match[1]!, session: Number(match[2]!) };
}

/** Group journal files by date */
function groupByDate(files: JournalFile[]): Map<string, JournalFile[]> {
  const groups = new Map<string, JournalFile[]>();
  for (const file of files) {
    const existing = groups.get(file.date) ?? [];
    existing.push(file);
    groups.set(file.date, existing);
  }
  return groups;
}

/** Merge multiple journal bodies into one */
function mergeBodies(files: JournalFile[]): string {
  const parts: string[] = [];
  for (const file of files) {
    if (file.empty) continue;
    parts.push(file.body.trim());
  }
  return `${parts.join("\n\n---\n\n")}\n`;
}

function firstValue(files: JournalFile[], key: string, excluded?: string): string | undefined {
  for (const file of files) {
    const raw = frontmatterValue(file.data, key);
    if (!raw) continue;
    const value = unquote(raw);
    if (value && value !== excluded) return value;
  }
  return undefined;
}

/** Build merged frontmatter from the best available data */
function buildMergedFrontmatter(date: string, files: JournalFile[]): string {
  // Pick the best title from non-empty files
  const contentFiles = files.filter((f) => !f.empty);
  const titles = contentFiles
    .map((f) => frontmatterValue(f.data, "title"))
    .filter((t): t is string => !!t)
    .map(unquote)
    .filter((t) => !t.startsWith("Journal —") && !t.startsWith("Session "));
  const title = titles[0] ?? `Journal — ${date}`;

  const allTags = new Set(contentFiles.flatMap((file) => getList(file.data, "tags")));
  const allDomain = new Set(contentFiles.flatMap((file) => getList(file.data, "domain")));
  const project = firstValue(contentFiles, "project");
  const summary = firstValue(contentFiles, "summary", "Empty session journal — no content recorded");

  const lines = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: ${date}`,
    `type: log`,
    `summary: "${(summary ?? "").replace(/"/g, '\\"')}"`,
  ];

  if (project) lines.push(`project: ${project}`);
  if (allDomain.size > 0) lines.push(`domain: [${[...allDomain].join(", ")}]`);
  if (allTags.size > 0) lines.push(`tags: [${[...allTags].join(", ")}]`);

  lines.push("---");
  return lines.join("\n");
}

function readJournals(journalDir: string): JournalFile[] {
  const journals: JournalFile[] = [];
  for (const filename of readdirSync(journalDir)) {
    const parsed = parseSessionFilename(filename);
    if (!parsed) continue;
    const filePath = join(journalDir, filename);
    const fm = parseFrontmatter(readFileSync(filePath, "utf-8"), filename);
    journals.push({ path: filePath, filename, ...parsed, body: fm.body, data: fm.data, empty: isEmpty(fm.body) });
  }
  return journals;
}

function deleteEmpty(files: JournalFile[], dryRun: boolean): void {
  for (const file of files) {
    if (dryRun) console.log(`  would delete (empty): ${file.filename}`);
    else unlinkSync(file.path);
  }
}

function renameSurvivor(file: JournalFile, targetPath: string, dryRun: boolean): number {
  if (file.path === targetPath || existsSync(targetPath)) return 0;
  if (dryRun) console.log(`  would rename: ${file.filename} → ${basename(targetPath)}`);
  else renameSync(file.path, targetPath);
  return 1;
}

function mergeDay(files: JournalFile[], targetPath: string, dryRun: boolean): void {
  const contentFiles = files.filter((file) => !file.empty);
  if (dryRun) {
    console.log(`  would merge ${contentFiles.length} sessions → ${basename(targetPath)}`);
    deleteEmpty(files.filter((file) => file.empty), true);
    return;
  }
  const mergedFm = buildMergedFrontmatter(files[0]!.date, files);
  Bun.write(targetPath, `${mergedFm}\n\n${mergeBodies(files)}`);
  for (const file of files) {
    if (file.path !== targetPath) unlinkSync(file.path);
  }
}

function compactProject(journalDir: string, dryRun: boolean): { deleted: number; merged: number; project: string } {
  const project = basename(join(journalDir, ".."));
  let deleted = 0;
  let merged = 0;
  if (!existsSync(journalDir)) return { deleted, merged, project };
  for (const [date, files] of groupByDate(readJournals(journalDir))) {
    files.sort((a, b) => a.session - b.session);
    const contentFiles = files.filter((file) => !file.empty);
    const emptyFiles = files.filter((file) => file.empty);
    if (files.length === 1 && !files[0]!.empty) continue;
    const targetPath = join(journalDir, `${date}.md`);
    if (contentFiles.length <= 1) {
      deleteEmpty(emptyFiles, dryRun);
      if (contentFiles[0]) merged += renameSurvivor(contentFiles[0], targetPath, dryRun);
    } else {
      mergeDay(files, targetPath, dryRun);
      merged++;
    }
    deleted += emptyFiles.length;
  }
  return { deleted, merged, project };
}

export async function compact(args: string[]): Promise<void> {
  const dryRun = args.includes("--dry-run");
  const stashRoot = getStashRoot();

  if (!existsSync(stashRoot)) {
    console.error(`Stash root not found: ${stashRoot}`);
    process.exit(1);
  }

  const projects = readdirSync(stashRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let totalDeleted = 0;
  let totalMerged = 0;

  if (dryRun) console.log("🔍 Dry run — no changes will be made\n");

  for (const project of projects) {
    const journalDir = join(stashRoot, project, "journal");
    if (!existsSync(journalDir)) continue;

    const result = compactProject(journalDir, dryRun);
    if (result.deleted > 0 || result.merged > 0) {
      console.log(`📦 ${result.project}: ${result.deleted} deleted, ${result.merged} merged`);
    }
    totalDeleted += result.deleted;
    totalMerged += result.merged;
  }

  if (totalDeleted === 0 && totalMerged === 0) {
    console.log("✨ All journals already compact");
  } else {
    console.log(`\n🗜️  Total: ${totalDeleted} empties removed, ${totalMerged} days merged`);
  }
}

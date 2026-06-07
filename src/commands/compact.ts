import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
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
  return parts.join("\n\n---\n\n") + "\n";
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

  // Merge tags and domain from all files
  const allTags = new Set<string>();
  const allDomain = new Set<string>();
  let project: string | undefined;
  let summary: string | undefined;

  for (const file of contentFiles) {
    for (const t of getList(file.data, "tags")) allTags.add(t);
    for (const d of getList(file.data, "domain")) allDomain.add(d);

    if (!project) {
      const p = frontmatterValue(file.data, "project");
      if (p) project = unquote(p);
    }
    if (!summary || summary === "" || summary === "Empty session journal — no content recorded") {
      const raw = frontmatterValue(file.data, "summary");
      const s = raw ? unquote(raw) : undefined;
      if (s && s !== "" && s !== "Empty session journal — no content recorded") summary = s;
    }
  }

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

function compactProject(journalDir: string, dryRun: boolean): { deleted: number; merged: number; project: string } {
  const project = basename(join(journalDir, ".."));
  let deleted = 0;
  let merged = 0;

  if (!existsSync(journalDir)) return { deleted, merged, project };

  const entries = readdirSync(journalDir).filter((f) => f.endsWith(".md"));
  const journals: JournalFile[] = [];

  for (const filename of entries) {
    const parsed = parseSessionFilename(filename);
    if (!parsed) continue; // skip non-session files like WORKING_CONTEXT.md or date-only files

    const filePath = join(journalDir, filename);
    const raw = readFileSync(filePath, "utf-8");
    const fm = parseFrontmatter(raw, filename);

    journals.push({
      path: filePath,
      filename,
      date: parsed.date,
      session: parsed.session,
      body: fm.body,
      data: fm.data,
      empty: isEmpty(fm.body),
    });
  }

  const groups = groupByDate(journals);

  for (const [date, files] of groups) {
    // Sort by session number
    files.sort((a, b) => a.session - b.session);

    const contentFiles = files.filter((f) => !f.empty);
    const emptyFiles = files.filter((f) => f.empty);

    // Single file, no work needed
    if (files.length === 1 && !files[0]!.empty) continue;

    // All empty — delete all
    if (contentFiles.length === 0) {
      for (const file of emptyFiles) {
        if (dryRun) {
          console.log(`  would delete (empty): ${file.filename}`);
        } else {
          unlinkSync(file.path);
        }
        deleted++;
      }
      continue;
    }

    // Single content file + empties — delete empties, rename content if needed
    if (contentFiles.length === 1) {
      for (const file of emptyFiles) {
        if (dryRun) {
          console.log(`  would delete (empty): ${file.filename}`);
        } else {
          unlinkSync(file.path);
        }
        deleted++;
      }

      // Rename the surviving file to YYYY-MM-DD.md if it's a session file
      const survivor = contentFiles[0]!;
      const targetName = `${date}.md`;
      const targetPath = join(journalDir, targetName);
      if (survivor.filename !== targetName && !existsSync(targetPath)) {
        if (dryRun) {
          console.log(`  would rename: ${survivor.filename} → ${targetName}`);
        } else {
          const { renameSync } = require("node:fs");
          renameSync(survivor.path, targetPath);
        }
        merged++;
      }
      continue;
    }

    // Multiple content files — merge into one YYYY-MM-DD.md
    const targetName = `${date}.md`;
    const targetPath = join(journalDir, targetName);
    const mergedBody = mergeBodies(files);
    const mergedFm = buildMergedFrontmatter(date, files);
    const mergedContent = mergedFm + "\n\n" + mergedBody;

    if (dryRun) {
      console.log(`  would merge ${contentFiles.length} sessions → ${targetName}`);
      for (const file of emptyFiles) {
        console.log(`  would delete (empty): ${file.filename}`);
      }
    } else {
      Bun.write(targetPath, mergedContent);
      // Delete all session files (the merged file replaces them)
      for (const file of files) {
        if (file.path !== targetPath) {
          unlinkSync(file.path);
        }
      }
    }
    merged++;
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

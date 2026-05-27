export interface ValidationIssue {
  code: string;
  file: string;
  line: number;
  message: string;
}

export type FrontmatterValue = string | string[];

export interface FrontmatterResult {
  body: string;
  bodyStartLine: number;
  data: Record<string, FrontmatterValue>;
  issues: ValidationIssue[];
}

export function issue(file: string, line: number, code: string, message: string): ValidationIssue {
  return { code, file, line, message };
}

export function formatIssues(issues: ValidationIssue[]): string {
  return issues
    .map((entry) => `${entry.file}:${entry.line} ${entry.message}`)
    .join("\n");
}

export function frontmatterValue(
  data: Record<string, FrontmatterValue>,
  key: string,
): string | undefined {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

export function frontmatterList(data: Record<string, FrontmatterValue>, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value : [];
}

function missingFrontmatter(content: string, file: string): FrontmatterResult {
  return {
    body: content,
    bodyStartLine: 1,
    data: {},
    issues: [issue(file, 1, "missing_frontmatter", "Missing frontmatter block")],
  };
}

function parseArrayValue(lines: string[], start: number): { nextIndex: number; values: string[] } {
  const values: string[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const entry = line.match(/^  - (.+)$/);
    if (!entry) break;
    values.push(entry[1]!);
    index += 1;
  }

  return { nextIndex: index, values };
}

function parseFrontmatterLine(line: string): { key: string; value?: string } | undefined {
  const entry = line.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
  if (!entry) return undefined;
  return {
    key: entry[1]!,
    value: entry[2],
  };
}

/** Extract first markdown heading as a title candidate */
function extractTitle(content: string): string | undefined {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1]!.trim() : undefined;
}

export interface FrontmatterExtra {
  project?: string;
  domain?: string[];
  tags?: string[];
  summary?: string;
}

/**
 * Prepend YAML frontmatter if the content doesn't already have it.
 * Journals and working contexts are both chronological session records → type: log.
 */
export function ensureFrontmatter(
  content: string,
  type: "log" | "note",
  date: string,
  label: string,
  extra?: FrontmatterExtra,
): string {
  if (content.startsWith("---\n")) return content;

  const title = extractTitle(content) ?? label;
  const lines = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: ${date}`,
    `type: ${type}`,
    `summary: "${(extra?.summary ?? "").replace(/"/g, '\\"')}"`,
  ];

  if (extra?.project) {
    lines.push(`project: ${extra.project}`);
  }
  if (extra?.domain && extra.domain.length > 0) {
    lines.push(`domain: [${extra.domain.join(", ")}]`);
  }
  if (extra?.tags && extra.tags.length > 0) {
    lines.push(`tags: [${extra.tags.join(", ")}]`);
  }

  lines.push("---", "");
  return lines.join("\n") + content;
}

export function parseFrontmatter(content: string, file: string): FrontmatterResult {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return missingFrontmatter(content, file);

  const data: Record<string, FrontmatterValue> = {};
  const issues: ValidationIssue[] = [];
  const lines = (match[1] ?? "").split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (!line.trim()) continue;

    const entry = parseFrontmatterLine(line);
    if (!entry) {
      issues.push(issue(file, i + 2, "invalid_frontmatter_line", `Invalid frontmatter line: ${line}`));
      continue;
    }

    if (entry.value !== undefined) {
      data[entry.key] = entry.value;
      continue;
    }

    const arrayValue = parseArrayValue(lines, i + 1);
    if (arrayValue.values.length > 0) {
      data[entry.key] = arrayValue.values;
      i = arrayValue.nextIndex - 1;
      continue;
    }

    data[entry.key] = "";
  }

  return {
    body: content.slice(match[0].length),
    bodyStartLine: match[0].split("\n").length,
    data,
    issues,
  };
}

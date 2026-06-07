import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  frontmatterValue,
  issue,
  parseFrontmatter,
  type FrontmatterValue,
  type ValidationIssue,
} from "./frontmatter.ts";
export interface DashboardItem {
  done: boolean;
  id: string;
  line: number;
  metadata: Record<string, string>;
  planId?: string;
  planPath?: string;
  sectionId: string;
  summary?: string;
  title: string;
}
export interface DashboardSection {
  depth: 2 | 3;
  id: string;
  items: DashboardItem[];
  line: number;
  parentId?: string;
  title: string;
}
export interface DashboardDoc {
  file: string;
  frontmatter: Record<string, FrontmatterValue>;
  issues: ValidationIssue[];
  items: DashboardItem[];
  path: string;
  sections: DashboardSection[];
  title: string;
  updated?: string;
}
const DASHBOARD_SCHEMA = "campsite-dashboard/v1";
function dashboardPath(cwd: string): string {
  return join(cwd, "DASHBOARD.md");
}

function missingDashboard(cwd: string): DashboardDoc {
  return {
    file: "DASHBOARD.md",
    frontmatter: {},
    issues: [issue("DASHBOARD.md", 1, "missing_dashboard", "DASHBOARD.md does not exist")],
    items: [],
    path: dashboardPath(cwd),
    sections: [],
    title: "DASHBOARD.md",
  };
}
function parseSectionHeading(
  lines: string[],
  index: number,
  currentH2Id: string | undefined,
  bodyStartLine: number,
): {
  issues: ValidationIssue[];
  nextH2Id?: string;
  nextIndex?: number;
  section?: DashboardSection;
} {
  const line = lines[index] ?? "";
  const heading = line.match(/^(#{2,3})\s+(.+?)\s*$/);
  if (!heading) return { issues: [] };

  const depth = heading[1]!.length as 2 | 3;
  const lineNumber = bodyStartLine + index;
  const markerLine = lines[index + 1] ?? "";
  const marker = markerLine.match(/^<!--\s*campsite:section id=([a-z0-9.-]+)\s*-->$/);
  if (!marker) {
    return {
      issues: [issue("DASHBOARD.md", lineNumber + 1, "missing_section_marker", `Missing section marker after heading: ${heading[2]!}`)],
      nextH2Id: depth === 2 ? undefined : currentH2Id,
    };
  }

  const id = marker[1]!;
  const issues = depth === 3 && !currentH2Id
    ? [issue("DASHBOARD.md", lineNumber, "orphan_subsection", `Subsection ${id} has no parent section`)]
    : [];

  return {
    issues,
    nextH2Id: depth === 2 ? id : currentH2Id,
    nextIndex: index + 1,
    section: {
      depth,
      id,
      items: [],
      line: lineNumber,
      parentId: depth === 3 ? currentH2Id : undefined,
      title: heading[2]!,
    },
  };
}
function parseItemMetadata(
  lines: string[],
  start: number,
  item: DashboardItem,
  bodyStartLine: number,
): { item: DashboardItem; issues: ValidationIssue[]; nextIndex: number } {
  const nextItem: DashboardItem = {
    ...item,
    metadata: { ...item.metadata },
  };
  const issues: ValidationIssue[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const lineNumber = bodyStartLine + index;
    if (line.match(/^  - \[( |x)\] /)) {
      issues.push(issue("DASHBOARD.md", lineNumber, "nested_checklist", `Nested checklist items are not supported under ${nextItem.id}`));
      index += 1;
      continue;
    }

    const metadata = line.match(/^  - ([a-z][a-z0-9-]*): (.+)$/);
    if (!metadata) break;

    const key = metadata[1]!;
    const value = metadata[2]!;
    nextItem.metadata[key] = value;

    if (key === "plan") {
      const planLink = value.match(/^\[(PLAN-\d+)\]\((plans\/[^)]+\.md)\)$/);
      if (!planLink) {
        issues.push(issue("DASHBOARD.md", lineNumber, "invalid_plan_link", `Invalid plan metadata for ${nextItem.id}`));
      } else {
        nextItem.planId = planLink[1]!;
        nextItem.planPath = planLink[2]!;
      }
    }

    index += 1;
  }

  return { item: nextItem, issues, nextIndex: index };
}
function validateSectionIds(sections: DashboardSection[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const section of sections) {
    if (ids.has(section.id)) {
      issues.push(issue("DASHBOARD.md", section.line, "duplicate_section_id", `Duplicate section id: ${section.id}`));
    }
    ids.add(section.id);
  }

  return issues;
}
function validateItems(cwd: string, items: DashboardItem[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const item of items) {
    if (ids.has(item.id)) {
      issues.push(issue("DASHBOARD.md", item.line, "duplicate_item_id", `Duplicate dashboard item id: ${item.id}`));
    }
    ids.add(item.id);

    if (item.planPath && !existsSync(join(cwd, item.planPath))) {
      issues.push(issue("DASHBOARD.md", item.line, "missing_plan_file", `Linked plan file does not exist: ${item.planPath}`));
    }
  }

  return issues;
}
function dashboardTitle(lines: string[]): string | undefined {
  return lines
    .map((line) => line.match(/^# (.+)$/)?.[1])
    .find((value) => value !== undefined);
}
function scanDashboardBody(
  lines: string[],
  bodyStartLine: number,
): { issues: ValidationIssue[]; items: DashboardItem[]; sections: DashboardSection[] } {
  const issues: ValidationIssue[] = [];
  const sections: DashboardSection[] = [];
  const items: DashboardItem[] = [];
  let currentH2Id: string | undefined;
  let currentSection: DashboardSection | undefined;

  for (let i = 0; i < lines.length; i += 1) {
    const sectionResult = parseSectionHeading(lines, i, currentH2Id, bodyStartLine);
    issues.push(...sectionResult.issues);
    if (sectionResult.section) {
      sections.push(sectionResult.section);
      currentSection = sectionResult.section;
      currentH2Id = sectionResult.nextH2Id;
      i = sectionResult.nextIndex ?? i;
      continue;
    }
    if (sectionResult.nextH2Id !== undefined || sectionResult.issues.length > 0) {
      currentH2Id = sectionResult.nextH2Id;
      currentSection = undefined;
      continue;
    }
    if (!currentSection) continue;

    const line = lines[i] ?? "";
    const itemMatch = line.match(/^- \[( |x)\] \[(DB-\d+)\] (.+?)(?: -- (.+))?$/);
    if (!itemMatch) continue;

    const item: DashboardItem = {
      done: itemMatch[1] === "x",
      id: itemMatch[2]!,
      line: bodyStartLine + i,
      metadata: {},
      sectionId: currentSection.id,
      summary: itemMatch[4],
      title: itemMatch[3]!,
    };

    const metadataResult = parseItemMetadata(lines, i + 1, item, bodyStartLine);
    issues.push(...metadataResult.issues);
    items.push(metadataResult.item);
    currentSection.items.push(metadataResult.item);
    i = metadataResult.nextIndex - 1;
  }

  return { issues, items, sections };
}
function dashboardIssues(input: {
  bodyStartLine: number;
  cwd: string;
  frontmatter: Record<string, FrontmatterValue>;
  items: DashboardItem[];
  sections: DashboardSection[];
  title: string | undefined;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (frontmatterValue(input.frontmatter, "schema") !== DASHBOARD_SCHEMA) {
    issues.push(issue("DASHBOARD.md", 1, "invalid_schema", `Expected schema: ${DASHBOARD_SCHEMA}`));
  }
  if (!input.title) {
    issues.push(issue("DASHBOARD.md", input.bodyStartLine, "missing_title", "Dashboard must include one H1 title"));
  }
  issues.push(...validateSectionIds(input.sections));
  issues.push(...validateItems(input.cwd, input.items));
  return issues;
}
export function parseDashboard(cwd: string = process.cwd()): DashboardDoc {
  if (!existsSync(dashboardPath(cwd))) return missingDashboard(cwd);

  const content = readFileSync(dashboardPath(cwd), "utf-8");
  const fm = parseFrontmatter(content, "DASHBOARD.md");
  const lines = fm.body.split("\n");
  const scan = scanDashboardBody(lines, fm.bodyStartLine);
  const title = dashboardTitle(lines);
  const issues = [
    ...fm.issues,
    ...scan.issues,
    ...dashboardIssues({
      bodyStartLine: fm.bodyStartLine,
      cwd,
      frontmatter: fm.data,
      items: scan.items,
      sections: scan.sections,
      title,
    }),
  ];

  return {
    file: "DASHBOARD.md",
    frontmatter: fm.data,
    issues,
    items: scan.items,
    path: dashboardPath(cwd),
    sections: scan.sections,
    title: title ?? "Dashboard",
    updated: frontmatterValue(fm.data, "updated"),
  };
}
export function findDashboardItem(doc: DashboardDoc, itemId: string): DashboardItem | undefined {
  return doc.items.find((item) => item.id === itemId);
}
export function readDashboardSections(doc: DashboardDoc, sectionId?: string): DashboardSection[] {
  if (!sectionId) return doc.sections;

  const section = doc.sections.find((entry) => entry.id === sectionId);
  if (!section) return [];
  if (section.depth === 3) return [section];
  return doc.sections.filter((entry) => entry.id === section.id || entry.parentId === section.id);
}

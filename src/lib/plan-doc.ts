import { basename, join } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  frontmatterList,
  frontmatterValue,
  issue,
  parseFrontmatter,
  type FrontmatterValue,
  type ValidationIssue,
} from "./frontmatter.ts";

export interface PlanCriterion {
  done: boolean;
  line: number;
  text: string;
}

export interface PlanDoc {
  criteria: PlanCriterion[];
  dashboardIds: string[];
  file: string;
  frontmatter: Record<string, FrontmatterValue>;
  h1Title?: string;
  id?: string;
  issues: ValidationIssue[];
  path: string;
  requiredSections: Record<string, number | undefined>;
  status?: string;
  ticket?: string;
  title?: string;
  updated?: string;
}

const PLAN_SCHEMA = "campsite-plan/v1";
const REQUIRED_PLAN_SECTIONS = [
  "Goal",
  "Scope",
  "Acceptance Criteria",
  "Out of Scope",
  "Notes",
] as const;

function plansDir(cwd: string): string {
  return join(cwd, "plans");
}

export function planFiles(cwd: string): string[] {
  if (!existsSync(plansDir(cwd))) return [];
  return readdirSync(plansDir(cwd))
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => join(plansDir(cwd), file));
}

export function findPlanById(cwd: string, planId: string): string | undefined {
  return planFiles(cwd).find((file) => basename(file).startsWith(`${planId}-`) || basename(file) === `${planId}.md`);
}

function emptyRequiredSections(): Record<string, number | undefined> {
  return Object.fromEntries(REQUIRED_PLAN_SECTIONS.map((section) => [section, undefined]));
}

function scanPlanBody(
  body: string,
  bodyStartLine: number,
): {
  criteria: PlanCriterion[];
  h1Id?: string;
  h1Title?: string;
  requiredSections: Record<string, number | undefined>;
} {
  const criteria: PlanCriterion[] = [];
  const requiredSections = emptyRequiredSections();
  const lines = body.split("\n");
  let currentSection: string | undefined;
  let h1Id: string | undefined;
  let h1Title: string | undefined;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const lineNumber = bodyStartLine + i;

    const h1 = line.match(/^# (PLAN-\d+): (.+)$/);
    if (h1) {
      h1Id = h1[1]!;
      h1Title = h1[2]!;
      continue;
    }

    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      currentSection = h2[1]!;
      if (currentSection in requiredSections) {
        requiredSections[currentSection] = lineNumber;
      }
      continue;
    }

    if (currentSection !== "Acceptance Criteria") continue;
    const criterion = line.match(/^- \[( |x)\] (.+)$/);
    if (!criterion) continue;
    criteria.push({
      done: criterion[1] === "x",
      line: lineNumber,
      text: criterion[2]!,
    });
  }

  return { criteria, h1Id, h1Title, requiredSections };
}

function requiredFrontmatterIssues(
  file: string,
  frontmatter: Record<string, FrontmatterValue>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (frontmatterValue(frontmatter, "schema") !== PLAN_SCHEMA) {
    issues.push(issue(file, 1, "invalid_schema", `Expected schema: ${PLAN_SCHEMA}`));
  }
  if (!frontmatterValue(frontmatter, "id")) {
    issues.push(issue(file, 1, "missing_plan_id", "Plan frontmatter must include id"));
  }
  if (!frontmatterValue(frontmatter, "title")) {
    issues.push(issue(file, 1, "missing_plan_title", "Plan frontmatter must include title"));
  }
  if (!frontmatterValue(frontmatter, "status")) {
    issues.push(issue(file, 1, "missing_plan_status", "Plan frontmatter must include status"));
  }
  if (!frontmatterValue(frontmatter, "updated")) {
    issues.push(issue(file, 1, "missing_plan_updated", "Plan frontmatter must include updated"));
  }
  return issues;
}

function identityIssues(
  path: string,
  file: string,
  frontmatter: Record<string, FrontmatterValue>,
  scan: ReturnType<typeof scanPlanBody>,
): ValidationIssue[] {
  const id = frontmatterValue(frontmatter, "id");
  const title = frontmatterValue(frontmatter, "title");
  const filenameId = basename(path).match(/^(PLAN-\d+)/)?.[1];
  return [
    ...filenameIssues(file, filenameId),
    ...h1Issues(file, scan),
    ...mismatchIssues({
      file,
      filenameId,
      id,
      scan,
      title,
    }),
  ];
}

function filenameIssues(file: string, filenameId?: string): ValidationIssue[] {
  return filenameId
    ? []
    : [issue(file, 1, "invalid_plan_filename", "Plan filename must start with PLAN-<n>")];
}

function h1Issues(file: string, scan: ReturnType<typeof scanPlanBody>): ValidationIssue[] {
  return scan.h1Id && scan.h1Title
    ? []
    : [issue(file, 1, "missing_plan_h1", "Plan must include an H1 in the format # PLAN-<n>: Title")];
}

function mismatchIssues(input: {
  file: string;
  filenameId?: string;
  id?: string;
  scan: ReturnType<typeof scanPlanBody>;
  title?: string;
}): ValidationIssue[] {
  if (!input.scan.h1Id || !input.scan.h1Title) return [];

  return [
    input.id && input.filenameId && input.id !== input.filenameId
      ? issue(input.file, 1, "plan_id_filename_mismatch", `Frontmatter id ${input.id} does not match filename ${input.filenameId}`)
      : undefined,
    input.id && input.id !== input.scan.h1Id
      ? issue(input.file, 1, "plan_id_h1_mismatch", `Frontmatter id ${input.id} does not match H1 ${input.scan.h1Id}`)
      : undefined,
    input.title && input.title !== input.scan.h1Title
      ? issue(input.file, 1, "plan_title_h1_mismatch", `Frontmatter title ${input.title} does not match H1 title ${input.scan.h1Title}`)
      : undefined,
  ].filter((entry): entry is ValidationIssue => entry !== undefined);
}

function requiredSectionIssues(
  file: string,
  requiredSections: Record<string, number | undefined>,
): ValidationIssue[] {
  return REQUIRED_PLAN_SECTIONS
    .filter((section) => !requiredSections[section])
    .map((section) => issue(file, 1, "missing_plan_section", `Missing required section: ${section}`));
}

function validatePlan(
  path: string,
  file: string,
  frontmatter: Record<string, FrontmatterValue>,
  scan: ReturnType<typeof scanPlanBody>,
): ValidationIssue[] {
  return [
    ...requiredFrontmatterIssues(file, frontmatter),
    ...identityIssues(path, file, frontmatter, scan),
    ...requiredSectionIssues(file, scan.requiredSections),
  ];
}

export function parsePlanFile(path: string): PlanDoc {
  const file = basename(path);
  const content = readFileSync(path, "utf-8");
  const fm = parseFrontmatter(content, file);
  const scan = scanPlanBody(fm.body, fm.bodyStartLine);
  const issues = [...fm.issues, ...validatePlan(path, file, fm.data, scan)];

  return {
    criteria: scan.criteria,
    dashboardIds: frontmatterList(fm.data, "dashboard"),
    file,
    frontmatter: fm.data,
    h1Title: scan.h1Title,
    id: frontmatterValue(fm.data, "id"),
    issues,
    path,
    requiredSections: scan.requiredSections,
    status: frontmatterValue(fm.data, "status"),
    ticket: frontmatterValue(fm.data, "ticket"),
    title: frontmatterValue(fm.data, "title"),
    updated: frontmatterValue(fm.data, "updated"),
  };
}

export function parsePlans(cwd: string = process.cwd()): PlanDoc[] {
  return planFiles(cwd).map((file) => parsePlanFile(file));
}

export function readPlan(cwd: string = process.cwd(), planId: string): PlanDoc | undefined {
  const file = findPlanById(cwd, planId);
  if (!file) return undefined;
  return parsePlanFile(file);
}

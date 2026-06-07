import { parseDashboard } from "./dashboard-doc.ts";
import { issue, type ValidationIssue } from "./frontmatter.ts";
import { findPlanById, parsePlanFile, parsePlans } from "./plan-doc.ts";

export * from "./dashboard-doc.ts";
export * from "./frontmatter.ts";
export * from "./plan-doc.ts";

export function lintDashboard(cwd: string = process.cwd()): ValidationIssue[] {
  return parseDashboard(cwd).issues;
}

function missingPlan(planId: string) {
  return [issue(planId, 1, "missing_plan", `Plan not found: ${planId}`)];
}

function missingPlansDir(): ValidationIssue[] {
  return [issue("plans", 1, "missing_plans_dir", "No plan files found in plans/")];
}

function lintablePlans(cwd: string, planId?: string) {
  if (!planId) return parsePlans(cwd);
  const file = findPlanById(cwd, planId);
  return file ? [parsePlanFile(file)] : [];
}

function duplicatePlanIssues(plans: ReturnType<typeof lintablePlans>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const planDoc of plans) {
    if (!planDoc.id) continue;
    if (seenIds.has(planDoc.id)) {
      issues.push(issue(planDoc.file, 1, "duplicate_plan_id", `Duplicate plan id: ${planDoc.id}`));
    }
    seenIds.add(planDoc.id);
  }

  return issues;
}

function linkedDashboardIssues(
  itemIds: Set<string>,
  plans: ReturnType<typeof lintablePlans>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const planDoc of plans) {
    for (const dashboardId of planDoc.dashboardIds) {
      if (!itemIds.has(dashboardId)) {
        issues.push(issue(planDoc.file, 1, "missing_dashboard_item", `Linked dashboard item does not exist: ${dashboardId}`));
      }
    }
  }
  return issues;
}

function dashboardIssuesForPlans(
  dashboardIssues: ValidationIssue[],
  plans: ReturnType<typeof lintablePlans>,
): ValidationIssue[] {
  return dashboardIssues.length > 0 && plans.some((planDoc) => planDoc.dashboardIds.length > 0)
    ? dashboardIssues
    : [];
}

export function lintPlans(cwd: string = process.cwd(), planId?: string): ValidationIssue[] {
  const dashboard = parseDashboard(cwd);
  const itemIds = new Set(dashboard.items.map((item) => item.id));
  const plans = lintablePlans(cwd, planId);

  if (planId && plans.length === 0) return missingPlan(planId);
  if (!planId && plans.length === 0) return missingPlansDir();

  return [
    ...plans.flatMap((planDoc) => planDoc.issues),
    ...dashboardIssuesForPlans(dashboard.issues, plans),
    ...duplicatePlanIssues(plans),
    ...linkedDashboardIssues(itemIds, plans),
  ];
}
